import { mkdir, readFile, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { DATA_VERSION, MANIFEST_PATH, PROJECT_FOLDERS, SUPPORTED_TEXT_EXTENSIONS } from '../../src/shared/constants.js';
import { auditPlanning, hasDraftedChapter, STORY_PLAN_TEMPLATE, storyPlanPath } from '../../src/shared/planning-audit.js';
import { compareNaturalPath } from '../../src/shared/natural-sort.js';
import type { AgentTaskRecord, AuthorProfile, ContinueCard, CreativeTask, GitPolicy, Goal, NavigationProposal, NovelEvent, ObserverComment, ProjectFile, ProjectManifest, ProjectState, StoryFact } from '../../src/shared/types.js';
import { relocateComment } from './observer.js';
import { reviewIsStale } from './literary-review.js';
import type { ReviewReport } from '../../src/shared/types.js';
import { EventStore } from './events.js';
import { GitService } from './git.js';
import { atomicWrite, exists, fileInfo, hashText, now, readJson, safeRelative, uid, writeJson } from './utils.js';

interface ReducedState {
  reviews: ReviewReport[];
  goals: Goal[];
  tasks: CreativeTask[];
  comments: ObserverComment[];
  facts: StoryFact[];
  proposals: NavigationProposal[];
  agentTasks: AgentTaskRecord[];
  lastFile?: string;
  stage?: string;
  focus?: string;
  focusOrder?: number;
  focusSource?: NovelEvent['source'];
  taskOrder: Record<string, number>;
  fileOrigins: Record<string, 'author' | 'external'>;
}

function category(relative: string): ProjectFile['category'] {
  if (relative.startsWith('manuscript/')) return 'manuscript';
  if (relative.startsWith('canon/')) return 'canon';
  if (relative.startsWith('planning/')) return 'planning';
  if (relative.startsWith('research/')) return 'research';
  if (relative.startsWith('decisions/')) return 'decision';
  if (relative.startsWith('.novel/')) return 'system';
  return 'other';
}

function replaceById<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) items.push(item); else items[index] = item;
}

function reduceEvents(events: NovelEvent[]): ReducedState {
  const state: ReducedState = { reviews: [], goals: [], tasks: [], comments: [], facts: [], proposals: [], agentTasks: [], fileOrigins: {}, taskOrder: {} };
  for (const [order, event] of events.entries()) {
    const payload = event.payload as unknown as Record<string, unknown>;
    if (event.type === 'review.report') replaceById(state.reviews, payload as unknown as ReviewReport);
    if (event.type === 'goal.upsert') replaceById(state.goals, payload as unknown as Goal);
    if (event.type === 'task.upsert') { replaceById(state.tasks, payload as unknown as CreativeTask); state.taskOrder[String(payload.id)] = order; }
    if (event.type === 'fact.upsert') replaceById(state.facts, payload as unknown as StoryFact);
    if (event.type === 'proposal.created' || event.type === 'proposal.updated') replaceById(state.proposals, payload as unknown as NavigationProposal);
    if (event.type === 'agent.task') replaceById(state.agentTasks, payload as unknown as AgentTaskRecord);
    if (event.type === 'comment.created' || event.type === 'comment.updated') replaceById(state.comments, payload as unknown as ObserverComment);
    if (event.type === 'project.position') {
      state.lastFile = String(payload.filePath ?? state.lastFile ?? '');
      state.stage = String(payload.stage ?? state.stage ?? '逐章创作');
      if (typeof payload.focus === 'string') { state.focus = payload.focus; state.focusOrder = order; state.focusSource = event.source; }
    }
    if (event.type === 'file.changed' && typeof payload.path === 'string' && (payload.origin === 'author' || payload.origin === 'external')) state.fileOrigins[payload.path] = payload.origin;
  }
  return state;
}

export class ProjectService {
  private root = '';
  private manifest?: ProjectManifest;
  private events?: EventStore;
  private git?: GitService;
  private openedDirty = new Set<string>();
  private authorRevision = 0;
  private readonly agentEdits = new Map<string, { taskId: string; revision: number; hash: string }>();
  private readonly authorEdits = new Map<string, { revision: number; hash: string }>();
  constructor(private readonly sessionId: string) {}

  get isActive() { return Boolean(this.root && this.manifest); }
  get activeRoot() { if (!this.root) throw new Error('尚未打开作品仓库'); return this.root; }
  get activeManifest() { if (!this.manifest) throw new Error('尚未打开作品仓库'); return this.manifest; }
  get eventStore() { if (!this.events) throw new Error('尚未打开作品仓库'); return this.events; }
  get gitService() { if (!this.git) throw new Error('尚未打开作品仓库'); return this.git; }
  get authorEditRevision() { return this.authorRevision; }

  isAuthorEditSince(file: string, hash: string, revision: number) {
    const edit = this.authorEdits.get(file);
    return Boolean(edit && edit.revision > revision && edit.hash === hash);
  }

  recordAgentEdits(taskId: string, hashes: Record<string, string>) {
    for (const [file, hash] of Object.entries(hashes)) this.agentEdits.set(file, { taskId, hash, revision: ++this.authorRevision });
  }

  isOtherAgentEditSince(taskId: string, file: string, hash: string, revision: number) {
    const edit = this.agentEdits.get(file);
    return Boolean(edit && edit.taskId !== taskId && edit.revision > revision && edit.hash === hash);
  }

  private recordAuthorEdit(file: string, hash: string) {
    // Only in-process workbench operations issue these receipts. A repository
    // event or an Agent's claimed origin is not proof that the author wrote it.
    this.authorEdits.set(file, { revision: ++this.authorRevision, hash });
  }

  async create(input: { root: string; title: string; kind: 'series' | 'novel'; idea?: string; targetCharacters?: number }) {
    if (!path.isAbsolute(input.root.trim())) throw new Error('仓库位置必须是绝对路径。可以填写尚不存在的新目录。');
    const root = path.resolve(input.root.trim());
    await mkdir(root, { recursive: true });
    const entries = await fg('*', { cwd: root, dot: true, onlyFiles: false, deep: 1 });
    if (entries.some((entry) => entry !== '.git')) throw new Error('目标目录已有内容，请填写新目录或空目录；接管已有作品请使用“打开其他仓库”。');
    for (const folder of PROJECT_FOLDERS) await mkdir(path.join(root, folder), { recursive: true });
    await mkdir(path.join(root, '.novel', 'events'), { recursive: true });
    await mkdir(path.join(root, '.novel', 'roles'), { recursive: true });
    const timestamp = now();
    const workId = 'work-1';
    const manuscriptRoot = input.kind === 'series' ? 'manuscript/work-1' : 'manuscript';
    const firstChapter = `${manuscriptRoot}/第一章.md`;
    const manifest: ProjectManifest = {
      schemaVersion: DATA_VERSION,
      projectId: uid('novel'),
      title: input.title.trim() || '未命名作品',
      kind: input.kind,
      language: 'zh-CN',
      createdAt: timestamp,
      updatedAt: timestamp,
      targetCharacters: Math.max(50_000, input.targetCharacters || 1_000_000),
      gitPolicy: 'author-checkpoints',
      activeWorkId: workId,
      works: [{ id: workId, title: input.title.trim() || '未命名作品', manuscriptRoot, status: 'planning' }]
    };
    await writeJson(path.join(root, MANIFEST_PATH), manifest);
    await atomicWrite(path.join(root, firstChapter), `# 第一章\n\n${input.idea ? `<!-- 创作灵感：${input.idea.replaceAll('-->', '—>')} -->\n\n` : ''}`);
    await atomicWrite(path.join(root, 'canon', '故事正典.md'), '# 故事正典\n\n> AI 推断与建议不得自动升级为作者确认。\n\n## 人物\n\n## 世界规则\n\n## 时间线\n\n## 知识边界\n\n## 伏笔与承诺\n');
    await atomicWrite(path.join(root, 'planning', '滚动规划.md'), `# ${manifest.title} · 滚动规划\n\n## 初始灵感（待确认）\n\n${input.idea || '待探索'}\n\n## 全书方向与结局假设\n\n待探索\n\n## 当前卷骨架\n\n## 未来一至三章\n`);
    await atomicWrite(path.join(root, storyPlanPath(manifest)), STORY_PLAN_TEMPLATE);
    await atomicWrite(path.join(root, 'research', 'README.md'), '# 研究资料\n\nResearcher 可以在任务授权范围内写入这里。区分来源事实、合理推断和待核实问题；研究资料不会自动升级为作品正典。\n');
    await atomicWrite(path.join(root, 'decisions', 'README.md'), '# 已确认决定\n\n高影响创作决定写在这里，保留日期、理由和影响范围。\n');
    await atomicWrite(path.join(root, 'canon', '作品风格.md'), '# 作品风格与角色声音\n\n## 已确认规则\n\n## 候选规则（需作者确认）\n\n## 角色声音\n\n## 临时例外\n');
    await atomicWrite(path.join(root, 'AGENTS.md'), `# 小说 Agent 协作规则\n\n这是中文长篇网文仓库，不是软件项目。\n\n- 正文位于 \`manuscript/\`，正典位于 \`canon/\`，滚动规划位于 \`planning/\`，研究资料位于 \`research/\`。\n- Writer 可在作者或工作台明确给出的任务范围内直接修改 Markdown/TXT 正文；Researcher 只能写入授权的 \`research/\` 范围。\n- 不得执行 \`git add\`、\`git commit\`、\`git push\`、\`git pull\`、merge 或 rebase；这些动作必须由作者另行明确授权。\n- 不得把 AI 推断或建议升级为作者确认的正典。核心正典变化只提出候选、证据和影响分析。\n- 保留人物知识边界、时间线、伏笔与正文证据。上下文不足时明确说明，不编造已经发生的事实。\n- 不建立隐藏正文草稿；修改直接留在工作区，供作者通过 Git diff 审查。\n- 不修改 \`.novel/events/\` 的历史行；平台事件只追加。\n`);
    await atomicWrite(path.join(root, '.novel', 'roles', 'writer.md'), '# Writer\n\n直接完成授权范围内的续写、重写、扩写、压缩或润色。先读取工作台上下文包，遵守正典、当前目标、POV、角色知识边界和作品声音。最终报告实际文件变化与仍需作者决定的事项。\n');
    await atomicWrite(path.join(root, '.novel', 'roles', 'observer.md'), '# Observer\n\n只审查不可变文本快照，不改正文。评论必须逐字锚定原文，区分建议、警告和阻塞问题；正文变化后按快照哈希重定位或过期，不把旧意见冒充当前意见。\n');
    await atomicWrite(path.join(root, '.novel', 'README.md'), '# .novel 数据目录\n\n`manifest.json` 标识项目与数据版本。`events/YYYY-MM/session-*.jsonl` 是目标、任务、评论、反馈和 Agent 摘要的只追加事件流，随 Git 迁移。完整 Agent 日志、界面缓存、登录凭据与未保存恢复点不放在这里。\n');
    await atomicWrite(path.join(root, '.gitignore'), ['.DS_Store', '*.swp', '*.tmp', ''].join('\n'));
    await this.activate(root, manifest);
    await this.gitService.ensureRepository();
    const goal = this.defaultGoal(input.idea);
    const task = this.defaultTask(input.idea, firstChapter);
    await this.eventStore.append('goal.upsert', goal as never, 'navigator');
    await this.eventStore.append('task.upsert', task as never, 'navigator');
    await this.eventStore.append('project.position', { filePath: firstChapter, stage: '灵感与创作意图', focus: '把一句灵感发展为可开书方向' }, 'system');
    return this.state();
  }

  async open(rootInput: string) {
    const root = path.resolve(rootInput);
    if (!(await exists(root))) throw new Error('作品目录不存在');
    const git = new GitService(root);
    await git.ensureRepository();
    const openedDirty = new Set((await git.status()).files.map((file) => file.path));
    const manifestPath = path.join(root, MANIFEST_PATH);
    let manifest: ProjectManifest;
    if (await exists(manifestPath)) {
      manifest = await readJson<ProjectManifest>(manifestPath);
      if (manifest.schemaVersion > DATA_VERSION) throw new Error(`项目数据版本 ${manifest.schemaVersion} 高于当前支持版本 ${DATA_VERSION}，请升级工作台`);
      if (manifest.schemaVersion < DATA_VERSION) throw new Error(`项目数据版本 ${manifest.schemaVersion} 低于当前支持版本 ${DATA_VERSION}。工作台没有静默改写：请先备份仓库，再使用对应版本的显式迁移器升级。`);
    } else {
      const title = path.basename(root);
      const timestamp = now();
      manifest = { schemaVersion: DATA_VERSION, projectId: uid('novel'), title, kind: 'novel', language: 'zh-CN', createdAt: timestamp, updatedAt: timestamp, activeWorkId: 'work-1', works: [{ id: 'work-1', title, manuscriptRoot: 'manuscript', status: 'serializing' }] };
      await mkdir(path.dirname(manifestPath), { recursive: true });
      await writeJson(manifestPath, manifest);
    }
    for (const folder of PROJECT_FOLDERS) await mkdir(path.join(root, folder), { recursive: true });
    const existingTexts = await fg(['**/*.md', '**/*.markdown', '**/*.txt'], { cwd: root, dot: true, onlyFiles: true, ignore: ['.git/**', '.novel/**', 'node_modules/**'] });
    if (!existingTexts.length) {
      await atomicWrite(path.join(root, 'manuscript', '第一章.md'), '# 第一章\n\n');
      await atomicWrite(path.join(root, 'planning', '滚动规划.md'), `# ${manifest.title} · 滚动规划\n\n## 初始灵感（待确认）\n\n待探索\n\n## 全书方向与结局假设\n\n待探索\n\n## 当前卷骨架\n\n## 未来一至三章\n`);
      await atomicWrite(path.join(root, storyPlanPath(manifest)), STORY_PLAN_TEMPLATE);
      await atomicWrite(path.join(root, 'canon', '故事正典.md'), '# 故事正典\n\n> AI 推断与建议不得自动升级为作者确认。\n\n## 人物\n\n## 世界规则\n\n## 时间线\n\n## 知识边界\n\n## 伏笔与承诺\n');
    }
    await this.activate(root, manifest, openedDirty);
    const events = await this.eventStore.all();
    if (!events.length) {
      await this.eventStore.append('goal.upsert', this.defaultGoal() as never, 'navigator');
      await this.eventStore.append('task.upsert', this.defaultTask() as never, 'navigator');
    }
    return this.state();
  }

  async addWork(titleInput: string) {
    if (this.activeManifest.kind !== 'series') throw new Error('独立小说不需要添加系列作品');
    const title = titleInput.trim();
    if (!title) throw new Error('作品名不能为空');
    const id = uid('work');
    const manuscriptRoot = `manuscript/work-${this.activeManifest.works.length + 1}`;
    const work = { id, title, manuscriptRoot, status: 'planning' as const };
    this.manifest = { ...this.activeManifest, activeWorkId: id, updatedAt: now(), works: [...this.activeManifest.works, work] };
    await writeJson(path.join(this.activeRoot, MANIFEST_PATH), this.manifest);
    await atomicWrite(path.join(this.activeRoot, manuscriptRoot, '第一章.md'), '# 第一章\n\n');
    await atomicWrite(path.join(this.activeRoot, storyPlanPath(this.manifest)), STORY_PLAN_TEMPLATE);
    this.recordAuthorEdit(`${manuscriptRoot}/第一章.md`, hashText('# 第一章\n\n'));
    this.recordAuthorEdit(storyPlanPath(this.manifest), hashText(STORY_PLAN_TEMPLATE));
    await this.eventStore.append('project.position', { filePath: `${manuscriptRoot}/第一章.md`, stage: '灵感与创作意图', focus: `为《${title}》确定可开书方向` }, 'system');
    return this.state();
  }

  async activateWork(workId: string) {
    const work = this.activeManifest.works.find((item) => item.id === workId);
    if (!work) throw new Error('作品不存在');
    this.manifest = { ...this.activeManifest, activeWorkId: workId, updatedAt: now() };
    await writeJson(path.join(this.activeRoot, MANIFEST_PATH), this.manifest);
    const firstFile = (await this.files()).find((file) => file.path.startsWith(`${work.manuscriptRoot}/`));
    await this.eventStore.append('project.position', { filePath: firstFile?.path || '', stage: work.status === 'planning' ? '灵感与创作意图' : '逐章创作与修订', focus: `继续《${work.title}》` }, 'system');
    return this.state();
  }

  async updateGitPolicy(policy: GitPolicy) {
    if (policy !== 'author-checkpoints' && policy !== 'local-only') throw new Error('不支持的 Git 提交策略');
    const previous = this.activeManifest.gitPolicy ?? 'author-checkpoints';
    if (previous === policy) return this.state();
    this.manifest = { ...this.activeManifest, gitPolicy: policy, updatedAt: now() };
    await writeJson(path.join(this.activeRoot, MANIFEST_PATH), this.manifest);
    await this.eventStore.append('project.policy.updated', { git: policy, previousGit: previous, updatedAt: this.manifest.updatedAt }, 'author');
    return this.state();
  }

  async markWorkSerializing(filePath?: string) {
    const normalized = filePath?.replaceAll('\\', '/');
    const target = normalized
      ? this.activeManifest.works.find((work) => normalized === work.manuscriptRoot || normalized.startsWith(`${work.manuscriptRoot.replace(/\/$/, '')}/`))
      : this.activeManifest.works.find((work) => work.id === this.activeManifest.activeWorkId);
    if (!target || target.status !== 'planning') return this.activeManifest;
    this.manifest = {
      ...this.activeManifest,
      updatedAt: now(),
      works: this.activeManifest.works.map((work) => work.id === target.id ? { ...work, status: 'serializing' as const } : work)
    };
    await writeJson(path.join(this.activeRoot, MANIFEST_PATH), this.manifest);
    return this.activeManifest;
  }

  async removeWorkForTrash(workId: string) {
    if (this.activeManifest.kind !== 'series') throw new Error('只有系列仓库可以单独移除其中一部作品');
    if (this.activeManifest.works.length <= 1) throw new Error('系列仓库至少保留一部作品；如需删除全部内容，请从作品中心处理整个仓库');
    const index = this.activeManifest.works.findIndex((item) => item.id === workId);
    if (index < 0) throw new Error('系列作品不存在');
    const item = this.activeManifest.works[index];
    const wasActive = this.activeManifest.activeWorkId === item.id;
    const works = this.activeManifest.works.filter((work) => work.id !== item.id);
    this.manifest = { ...this.activeManifest, works, activeWorkId: wasActive ? works[0].id : this.activeManifest.activeWorkId, updatedAt: now() };
    await writeJson(path.join(this.activeRoot, MANIFEST_PATH), this.manifest);
    return { item, index, wasActive };
  }

  async restoreWorkFromTrash(backup: { item: ProjectManifest['works'][number]; index: number; wasActive: boolean }) {
    if (this.activeManifest.kind !== 'series') throw new Error('当前仓库不是系列作品，无法恢复该作品条目');
    if (this.activeManifest.works.some((item) => item.id === backup.item.id || item.manuscriptRoot === backup.item.manuscriptRoot)) throw new Error('同一系列作品或正文目录已经存在，未覆盖任何内容');
    const works = [...this.activeManifest.works];
    works.splice(Math.max(0, Math.min(backup.index, works.length)), 0, backup.item);
    this.manifest = { ...this.activeManifest, works, activeWorkId: backup.wasActive ? backup.item.id : this.activeManifest.activeWorkId || backup.item.id, updatedAt: now() };
    await writeJson(path.join(this.activeRoot, MANIFEST_PATH), this.manifest);
  }

  async linkAuthorProfile(profile: AuthorProfile) {
    // Keep every rule and its status portable. Runtime prompts distinguish
    // confirmed constraints from candidates and rejected proposals.
    const snapshot: AuthorProfile = { ...profile, rules: [...profile.rules] };
    this.manifest = { ...this.activeManifest, authorProfile: { id: profile.id, snapshot: JSON.stringify(snapshot) }, updatedAt: now() };
    await writeJson(path.join(this.activeRoot, MANIFEST_PATH), this.manifest);
    await this.eventStore.append('author-profile.linked', {
      id: profile.id,
      totalRuleCount: snapshot.rules.length,
      confirmedRuleCount: snapshot.rules.filter((rule) => rule.status === 'confirmed').length,
      candidateRuleCount: snapshot.rules.filter((rule) => rule.status === 'candidate').length,
      updatedAt: profile.updatedAt
    }, 'author');
  }

  private async activate(root: string, manifest: ProjectManifest, openedDirty = new Set<string>()) {
    this.authorEdits.clear();
    this.authorRevision += 1;
    this.root = root;
    this.manifest = manifest;
    this.events = new EventStore(root, this.sessionId);
    this.git = new GitService(root);
    this.openedDirty = openedDirty;
  }

  async state(): Promise<ProjectState> {
    const [{ files, manuscriptContents, planningDocuments }, events, git] = await Promise.all([this.textSnapshot(), this.eventStore.all(), this.gitService.status()]);
    const planningScope = this.activeManifest.kind === 'series' ? `planning/${this.activeManifest.activeWorkId || 'work-1'}/` : 'planning/';
    const planningAudit = auditPlanning(planningDocuments.filter((doc) => this.activeManifest.kind !== 'series' || doc.path.startsWith(planningScope) || doc.path.startsWith(`canon/${this.activeManifest.activeWorkId || 'work-1'}/`)));
    const reduced = reduceEvents(events);
    const manuscriptPaths = files.filter((file) => file.category === 'manuscript').map((file) => file.path);
    const currentTexts = new Map(manuscriptPaths.map((file, index) => [file, manuscriptContents[index]]));
    reduced.comments = reduced.comments.map((comment) => {
      if (!comment.anchor.filePath.startsWith('manuscript/')) return comment;
      const relocated = relocateComment(comment, currentTexts.get(comment.anchor.filePath) ?? '');
      return { ...relocated, updatedAt: comment.updatedAt };
    });
    if (reduced.reviews.length) {
      const manuscriptFiles = files.filter((file) => file.category === 'manuscript');
      const hashes = Object.fromEntries(manuscriptFiles.map((file, index) => [file.path, hashText(manuscriptContents[index] ?? '')]));
      const references = [...new Set(reduced.reviews.flatMap((report) => report.sources.map((source) => source.filePath)))].filter((file) => hashes[file] === undefined);
      for (const file of references) { try { hashes[file] = (await this.readFile(file)).hash; } catch { /* Missing references make the report stale. */ } }
      reduced.reviews = reduced.reviews.map((report) => {
        if (!report.protocolVersion && ['clear', 'findings'].includes(report.status)) report = { ...report, status: 'incomplete', gaps: [...report.gaps, '早期报告没有逐章阅读证据，不能计入完整覆盖。'] };
        const task = reduced.agentTasks.find((item) => item.id === report.taskId);
        const ended = report.status === 'running' && task && ['failed', 'cancelled', 'interrupted'].includes(task.state);
        return { ...report, ...(ended ? { status: task.state === 'cancelled' ? 'cancelled' as const : 'failed' as const, summary: task.error || '上次审阅中断，请重新检查。' } : {}), stale: reviewIsStale(report, hashes) };
      });
    }
    const goal = [...reduced.goals].filter((item) => item.status === 'active').sort((a, b) => ['author-pinned', 'active-task', 'confirmed-plan', 'agent-suggestion'].indexOf(a.authority) - ['author-pinned', 'active-task', 'confirmed-plan', 'agent-suggestion'].indexOf(b.authority))[0];
    const current = reduced.tasks.filter((item) => item.status === 'now');
    const activeWork = this.activeManifest.works.find((work) => work.id === this.activeManifest.activeWorkId);
    const taskAppliesToWork = (task: CreativeTask) => !activeWork || !task.links.some((file) => file.startsWith('manuscript/')) || task.links.some((file) => file === activeWork.manuscriptRoot || file.startsWith(`${activeWork.manuscriptRoot}/`));
    const currentForWork = current.filter(taskAppliesToWork);
    const next = [...currentForWork, ...reduced.tasks.filter((item) => item.status === 'next' && taskAppliesToWork(item))].slice(0, 3);
    const importantComments = reduced.comments.filter((item) => item.status === 'open' && item.severity !== 'suggestion').slice(0, 5);
    const activeTask = currentForWork[0];
    const manuscriptFiles = files.filter((file) => file.category === 'manuscript' && (!activeWork || file.path === activeWork.manuscriptRoot || file.path.startsWith(`${activeWork.manuscriptRoot}/`)));
    const taskFile = activeTask?.kind === 'writing'
      ? activeTask.links.find((file) => manuscriptFiles.some((item) => item.path === file)) || manuscriptFiles.find((file) => file.path === reduced.lastFile)?.path || manuscriptFiles[0]?.path
      : activeTask?.links.find((file) => files.some((item) => item.path === file));
    const continueFile = taskFile || reduced.lastFile || manuscriptFiles[0]?.path;
    const taskFocusIsNewer = Boolean(activeTask && (reduced.taskOrder[activeTask.id] ?? -1) > (reduced.focusOrder ?? -1));
    const finishedReviewFocus = !activeTask && reduced.focusSource === 'agent' && /^审查.+并推进下一章$/.test(reduced.focus || '');
    const card: ContinueCard = {
      location: this.locationFrom(files, continueFile),
      stage: planningAudit.attention.length === 0 && !manuscriptContents.some(hasDraftedChapter) && (!reduced.stage || ['灵感与创作意图', '全书路线与结局假设'].includes(reduced.stage)) ? '开篇和前三章' : reduced.stage || (files.some((item) => item.category === 'manuscript' && item.size > 50) ? '逐章创作与修订' : '灵感与创作意图'),
      lastFile: continueFile,
      goal,
      focus: activeTask
        ? (taskFocusIsNewer ? activeTask.title : reduced.focus || activeTask.title)
        : (finishedReviewFocus ? next[0]?.title || goal?.title || reduced.focus : reduced.focus || next[0]?.title || goal?.title) || '确定下一步创作重点',
      next,
      blockers: reduced.tasks.filter((item) => item.status === 'blocked' && taskAppliesToWork(item)),
      importantComments
    };
    const agentFiles = new Set(reduced.agentTasks.flatMap((task) => task.changedFiles));
    const attributedGit = { ...git, files: git.files.map((file) => ({ ...file, origin: this.openedDirty.has(file.path) ? 'pre-existing' as const : agentFiles.has(file.path) ? 'agent' as const : reduced.fileOrigins[file.path] ?? file.origin })) };
    const draftedChapters = manuscriptContents.filter(hasDraftedChapter);
    const totalCharacters = draftedChapters.reduce((sum, content) => sum + content.replace(/\s/g, '').length, 0);
    const targetCharacters = this.activeManifest.targetCharacters || 1_000_000;
    const manuscriptStats = { totalCharacters, targetCharacters, chapterCount: manuscriptContents.length, draftedChapterCount: draftedChapters.length, progress: Math.min(1, totalCharacters / targetCharacters) };
    return { root: this.activeRoot, manifest: this.activeManifest, files, ...reduced, dataWarnings: this.eventStore.diagnostics, manuscriptStats, planningAudit, continueCard: card, git: attributedGit };
  }

  async files() {
    const entries = await fg(['**/*.md', '**/*.markdown', '**/*.txt'], { cwd: this.activeRoot, dot: true, onlyFiles: true, ignore: ['.git/**', 'node_modules/**'] });
    const files: ProjectFile[] = [];
    for (const relative of entries) {
      const extension = path.extname(relative).toLowerCase();
      if (!SUPPORTED_TEXT_EXTENSIONS.has(extension)) continue;
      let info;
      try { info = await stat(path.join(this.activeRoot, relative)); }
      catch (error) {
        // Chokidar can request a refresh between an Agent's atomic rename,
        // move or trash operation and the next directory scan. A path that
        // disappeared after fast-glob listed it belongs to the next snapshot,
        // not to a fatal project error.
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw error;
      }
      files.push({ path: relative, name: path.basename(relative), extension, category: category(relative), size: info.size, modifiedAt: info.mtime.toISOString() });
    }
    return files.sort((a, b) => compareNaturalPath(a.path, b.path));
  }

  private async textSnapshot() {
    let lastMissing: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const files = await this.files();
      try {
        const manuscriptContents = await Promise.all(files
          .filter((item) => item.category === 'manuscript')
          .map((item) => readFile(path.join(this.activeRoot, item.path), 'utf8')));
        const planningDocuments = await Promise.all(files
          .filter((item) => item.category === 'planning' || item.category === 'canon')
          .map(async (item) => ({ path: item.path, content: await readFile(path.join(this.activeRoot, item.path), 'utf8') })));
        return { files, manuscriptContents, planningDocuments };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        lastMissing = error;
        // Yield once so the atomic rename/move can settle, then rebuild both
        // the file tree and character totals from the same fresh snapshot.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    throw lastMissing;
  }

  async readFile(requested: string) {
    const relative = safeRelative(this.activeRoot, requested);
    if (!SUPPORTED_TEXT_EXTENSIONS.has(path.extname(relative).toLowerCase())) throw new Error('只支持 Markdown 和 TXT 正文/资料');
    return { path: relative, ...(await fileInfo(path.join(this.activeRoot, relative))) };
  }

  async search(queryInput: string) {
    const query = queryInput.trim().toLocaleLowerCase('zh-CN');
    if (!query) return [];
    const results: Array<{ path: string; line: number; excerpt: string; rank: number }> = [];
    for (const file of await this.files()) {
      if (file.category === 'system') continue;
      const content = await readFile(path.join(this.activeRoot, file.path), 'utf8');
      const lines = content.split('\n');
      const pathLower = file.path.toLocaleLowerCase('zh-CN');
      const titleLower = path.basename(file.path, path.extname(file.path)).toLocaleLowerCase('zh-CN');
      const matchingLines = lines.map((line, index) => ({ line, index })).filter((item) => item.line.toLocaleLowerCase('zh-CN').includes(query));
      const pathRank = titleLower.includes(query) ? 0 : pathLower.includes(query) ? 1 : null;
      if (pathRank !== null) {
        const bestLine = matchingLines[0];
        results.push({ path: file.path, line: (bestLine?.index ?? 0) + 1, excerpt: (bestLine?.line.trim() || path.basename(file.path)).slice(0, 180), rank: pathRank });
      }
      for (const match of matchingLines.slice(0, 4)) {
        if (pathRank !== null && match.index === matchingLines[0]?.index) continue;
        results.push({ path: file.path, line: match.index + 1, excerpt: match.line.trim().slice(0, 180), rank: match.line.trimStart().startsWith('#') ? 2 : 3 });
      }
    }
    return results
      .sort((left, right) => left.rank - right.rank || compareNaturalPath(left.path, right.path) || left.line - right.line)
      .slice(0, 100)
      .map(({ rank: _rank, ...result }) => result);
  }

  async writeFile(requested: string, content: string, expectedHash?: string, createOnly = false) {
    const relative = safeRelative(this.activeRoot, requested);
    if (!SUPPORTED_TEXT_EXTENSIONS.has(path.extname(relative).toLowerCase())) throw new Error('只支持 Markdown 和 TXT 正文/资料');
    const target = path.join(this.activeRoot, relative);
    if (await exists(target)) {
      if (createOnly) throw new Error(`文件“${relative}”已经存在，未覆盖原内容`);
      const disk = await fileInfo(target);
      if (expectedHash && disk.hash !== expectedHash) return { path: relative, ...disk, conflict: { diskContent: disk.content, expectedHash, actualHash: disk.hash } };
    }
    await atomicWrite(target, content);
    this.recordAuthorEdit(relative, hashText(content));
    return { path: relative, ...(await fileInfo(target)) };
  }

  async moveFile(fromRequested: string, toRequested: string) {
    const from = safeRelative(this.activeRoot, fromRequested);
    const to = safeRelative(this.activeRoot, toRequested);
    if (!SUPPORTED_TEXT_EXTENSIONS.has(path.extname(from).toLowerCase()) || !SUPPORTED_TEXT_EXTENSIONS.has(path.extname(to).toLowerCase())) throw new Error('只支持移动或重命名 Markdown/TXT 文件');
    const source = path.join(this.activeRoot, from);
    const target = path.join(this.activeRoot, to);
    if (!(await exists(source))) throw new Error(`源文件“${from}”不存在`);
    if (await exists(target)) throw new Error(`目标文件“${to}”已经存在，未覆盖任何内容`);
    const sourceHash = hashText(await readFile(source));
    await mkdir(path.dirname(target), { recursive: true });
    await rename(source, target);
    this.recordAuthorEdit(from, 'missing');
    this.recordAuthorEdit(to, sourceHash);
    return { from, to };
  }

  async hashFiles(requested: string[]) {
    const result: Record<string, string> = {};
    for (const item of requested) {
      try { result[item] = hashText(await readFile(path.join(this.activeRoot, safeRelative(this.activeRoot, item)))); }
      catch { result[item] = 'missing'; }
    }
    return result;
  }

  private locationFrom(files: ProjectFile[], lastFile?: string) {
    const target = lastFile || files.filter((item) => item.category === 'manuscript').at(-1)?.path;
    return target ? `${this.activeManifest.works.find((item) => item.id === this.activeManifest.activeWorkId)?.title || this.activeManifest.title} · ${path.basename(target, path.extname(target))}` : this.activeManifest.title;
  }

  private defaultGoal(idea = ''): Goal {
    return { id: uid('goal'), level: 'work', title: idea ? '把核心灵感发展为可持续连载的故事发动机' : '明确当前作品方向', description: idea || '让 Navigator 根据现有正文和计划提出建议。', authority: 'agent-suggestion', status: 'active', updatedAt: now() };
  }

  private defaultTask(idea = '', firstChapter = 'manuscript/第一章.md'): CreativeTask {
    const timestamp = now();
    return {
      id: uid('task'), title: '完成开书最小准备', description: '确认故事承诺、主角、核心冲突和第一章目标。', level: 'work', status: 'now', kind: 'writing', assignee: 'navigator', source: 'navigator', priority: 'high',
      whyNow: '只确认少量高影响方向，就可以尽快进入第一章。', known: idea ? [`初始灵感：${idea}`] : [], missingDecisions: ['读者会持续追看的核心承诺是什么？', '主角最迫切的目标与失败代价是什么？'], aiPreAnalysis: 'Navigator 可以先读取现有资料并给出多个候选，不需要填写长问卷。', authorDecision: '选择、组合或否定候选方向。', agentWork: '生成故事发动机、最小设定、前三章路线和第一章目标。', completionCriteria: ['已选定核心故事承诺', '已明确主角与核心冲突', '第一章有可执行目标'], links: ['planning/滚动规划.md', firstChapter], dependencies: [], createdAt: timestamp, updatedAt: timestamp
    };
  }
}
