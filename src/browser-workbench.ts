import { DEFAULT_SETTINGS } from './shared/constants';
import type {
  AgentAdapterInfo, AgentTaskRecord, AuthorProfile, CreativeTask, EventSource, FileReadResult, Goal, JsonValue,
  NavigationProposal, NovelEvent, ObserverComment, ProjectFile, ProjectState, Settings, StoryFact, TrashEntry, WorkbenchApi
} from './shared/types';

const timestamp = '2026-08-18T12:00:00.000Z';
const chapterPath = 'manuscript/第一章.md';
const chapter = `# 第一章 雨夜来信

雨从傍晚下到午夜，顾临川送完最后一单，才发现车筐里多了一封没有邮票的信。

信封被雨淋得发软，收件人却写着他的名字。墨迹很新，像有人刚在他背后写完。

他没有立刻拆。三年前母亲失踪后，他见过太多用神秘兜售希望的骗子。

那是母亲生前刻坏的印章：一只少了左眼的渡鸦。

“别拆。”女孩说，“至少别在十二点以后拆。”

他的手机亮了一下。零点零一分。
`;

function clone<T>(value: T): T { return structuredClone(value); }
function id(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function hash(content: string) { return `browser-${content.length}-${[...content].reduce((sum, item) => (sum + item.codePointAt(0)!) % 65_535, 0)}`; }
function file(path: string, category: ProjectFile['category'], content: string): ProjectFile {
  return { path, name: path.split('/').at(-1)!, extension: path.split('.').at(-1) === 'txt' ? '.txt' : '.md', category, size: content.length, modifiedAt: timestamp };
}

function categoryForPath(filePath: string): ProjectFile['category'] {
  if (filePath.startsWith('manuscript/')) return 'manuscript';
  if (filePath.startsWith('planning/')) return 'planning';
  if (filePath.startsWith('research/')) return 'research';
  if (filePath.startsWith('canon/')) return 'canon';
  if (filePath.startsWith('decisions/')) return 'decision';
  if (filePath.startsWith('.novel/')) return 'system';
  return 'other';
}

function seed() {
  const files = new Map<string, string>([
    [chapterPath, chapter],
    ['planning/滚动规划.md', '# 滚动规划\n\n## 当前卷\n让顾临川发现来信规则与母亲失踪有关。\n'],
    ['canon/故事正典.md', '# 故事正典\n\n- 顾临川：外卖员，母亲三年前失踪。\n- 来信只在雨夜出现。\n'],
    ['canon/作品风格.md', '# 作品风格\n\n悬疑信息落在动作与物件上，避免长段解释。\n'],
    ['research/README.md', '# 研究资料\n\n来源、推断和待核实问题分开记录。\n'],
    ['decisions/README.md', '# 已确认决定\n\n高影响决定由作者确认。\n']
  ]);
  const goal: Goal = { id: 'goal-demo', level: 'work', title: '把雨夜来信发展为可持续连载的故事发动机', description: '用第一次规则验证把母亲失踪、来信代价和主角行动绑在一起。', authority: 'author-pinned', status: 'active', updatedAt: timestamp };
  const taskNow: CreativeTask = { id: 'task-now', title: '完成拆信后的第一次规则验证', description: '让顾临川主动验证规则。', level: 'chapter', status: 'now', kind: 'writing', assignee: 'author', source: 'author', priority: 'high', whyNow: '开篇已经给出异常物和警告，下一步必须兑现规则。', known: ['信使用母亲的渡鸦印章'], missingDecisions: ['他为何冒险拆信？'], aiPreAnalysis: '用现实危机迫使他选择。', authorDecision: '', agentWork: '', completionCriteria: ['规则可验证', '代价落到主角身上'], links: [chapterPath], dependencies: [], createdAt: timestamp, updatedAt: timestamp };
  const taskNext: CreativeTask = { ...taskNow, id: 'task-next', title: '确定前三章的升级节奏', status: 'next', assignee: 'navigator', whyNow: '首章方向明确后再展开，避免一次规划过多。' };
  const quote = '“别拆。”女孩说，“至少别在十二点以后拆。”';
  const start = chapter.indexOf(quote);
  const anchor = { filePath: chapterPath, start, end: start + quote.length, quote, prefix: chapter.slice(Math.max(0, start - 24), start), suffix: chapter.slice(start + quote.length, start + quote.length + 24), snapshotId: 'browser-demo-snapshot', snapshotHash: hash(chapter), currentHash: hash(chapter) };
  const warning: ObserverComment = { id: 'comment-warning', issueType: '人物动机', severity: 'warning', summary: '拆信需要比“好奇”更强的现实驱动力。', evidence: '前文刚建立主角对神秘骗局的警惕，无条件拆信会削弱性格。', suggestedAction: '让信件出现只有母亲知道的信息，或用现实危机迫使他选择。', anchor, status: 'open', reviewCount: 0, messages: [{ id: 'message-warning', source: 'observer', body: '建议补强拆信动机。', createdAt: timestamp }], createdAt: timestamp, updatedAt: timestamp };
  const blocking: ObserverComment = { ...warning, id: 'comment-blocking', issueType: '知识边界', severity: 'blocking', summary: '这里不能直接断言母亲已经死亡。', evidence: '当前正文与正典只确认母亲失踪，主角没有得知死亡事实。', suggestedAction: '改成“失踪前”，或先补足主角获知死讯的证据。', anchor: { ...anchor, start: chapter.indexOf('三年前母亲失踪后'), end: chapter.indexOf('三年前母亲失踪后') + '三年前母亲失踪后'.length, quote: '三年前母亲失踪后' }, messages: [{ id: 'message-blocking', source: 'observer', body: '人物知识边界与现有正典冲突。', createdAt: timestamp }] };
  const facts: StoryFact[] = [
    { id: 'fact-character', category: 'character', subject: '顾临川', statement: '外卖员；母亲三年前失踪；对神秘说法保持警惕。', status: 'text-explicit', evidence: [{ filePath: chapterPath, quote: '三年前母亲失踪后' }], updatedAt: timestamp },
    { id: 'fact-knowledge', category: 'knowledge', subject: '顾临川', statement: '只知道信件使用母亲的残缺渡鸦印章，尚不知道寄信规则。', status: 'text-explicit', evidence: [{ filePath: chapterPath, quote: '一只少了左眼的渡鸦' }], updatedAt: timestamp }
  ];
  const proposal: NavigationProposal = {
    id: 'proposal-demo', kind: 'routes', status: 'pending', title: '拆信后的三种推进路线', diagnosis: '当前不是缺少事件，而是缺少一个符合主角性格的行动理由。', highImpactQuestions: ['第一次规则验证要牺牲什么？'], recommendedGoal: '完成第一次规则验证', sourceTaskId: 'agent-navigator', createdAt: timestamp, updatedAt: timestamp,
    routes: [
      { id: 'route-a', title: '母亲留下私密暗号', pitch: '信中先出现只有母子知道的细节。', effect: '迅速建立可信度与情感牵引。', causalChain: ['识别暗号', '冒险拆信', '触发规则'], tradeoffs: ['母亲线索消耗较早'], risks: ['信息过密'], followUpImpact: '主角主动追查寄信规则。', requiredSetup: ['童年暗号'], firstChapterGoal: '确认来信与母亲有关' },
      { id: 'route-b', title: '现实危机迫使选择', pitch: '送餐事故与来信倒计时同时逼近。', effect: '强化行动与网文节奏。', causalChain: ['现实危机', '信件给出唯一解法', '付出代价'], tradeoffs: ['需要补一个现实人物'], risks: ['巧合感'], followUpImpact: '规则与现实生活持续互相侵入。', requiredSetup: ['需要被救的人'], firstChapterGoal: '用来信解决现实危机' },
      { id: 'route-c', title: '白裙女孩抢信', pitch: '女孩的阻止实际是一次争夺。', effect: '把警告转化为即时冲突。', causalChain: ['抢夺', '误拆', '规则显现'], tradeoffs: ['主角主动性稍弱'], risks: ['女孩动机需尽快解释'], followUpImpact: '建立两人互不信任的同盟。', requiredSetup: ['女孩为何不能亲自拆信'], firstChapterGoal: '在争夺中误触规则' }
    ]
  };
  const agentTasks: AgentTaskRecord[] = [{ id: 'agent-writer-demo', adapterId: 'codex', role: 'writer', state: 'completed', objective: '补强开篇的雨夜氛围', scope: [chapterPath], completionCriteria: ['保留人物知识边界'], sessionId: 'browser-preview-session', startedAt: timestamp, endedAt: timestamp, startHashes: { [chapterPath]: hash(chapter) }, changedFiles: [chapterPath], finalMessage: '已补强雨夜氛围，未改动正典。' }];
  const state: ProjectState = {
    root: 'browser-preview://雾城来信', manifest: { schemaVersion: 1, projectId: 'browser-preview', title: '雾城来信', kind: 'novel', language: 'zh-CN', createdAt: timestamp, updatedAt: timestamp, targetCharacters: 1_000_000, activeWorkId: 'work-1', works: [{ id: 'work-1', title: '雾城来信', manuscriptRoot: 'manuscript', status: 'serializing' }] },
    files: [...files].map(([path, content]) => file(path, categoryForPath(path), content)), goals: [goal], tasks: [taskNow, taskNext], comments: [warning, blocking], facts, proposals: [proposal], agentTasks, dataWarnings: [], manuscriptStats: { totalCharacters: chapter.replace(/\s/g, '').length, targetCharacters: 1_000_000, chapterCount: 1, progress: chapter.replace(/\s/g, '').length / 1_000_000 },
    continueCard: { location: '雾城来信 · 第一章', stage: '逐章创作、观察和修订', lastFile: chapterPath, goal, focus: taskNow.title, next: [taskNow, taskNext], blockers: [], importantComments: [warning, blocking] },
    git: { branch: 'main', ahead: 0, behind: 0, clean: false, files: [{ path: chapterPath, index: ' ', workingTree: 'M', category: 'manuscript', origin: 'agent' }, { path: '.novel/events/2026-08/session-demo.jsonl', index: '?', workingTree: '?', category: 'system', origin: 'unknown' }] }
  };
  return { files, state };
}

export function createBrowserWorkbench(): WorkbenchApi {
  const seeded = seed();
  let project = seeded.state;
  let settings: Settings = clone(DEFAULT_SETTINGS);
  let observer = { active: false, count: 0, budget: 40, startedAt: undefined as string | undefined };
  const trashEntries: Array<TrashEntry & { payload: Array<[string, string]> }> = [];
  let profile: AuthorProfile = { schemaVersion: 1, id: 'browser-author', name: '演示作者', updatedAt: timestamp, rules: [{ id: 'style-demo', category: 'voice', text: '悬疑信息优先落在动作和物件上。', status: 'confirmed', evidence: ['第一章', '作者反馈'], createdAt: timestamp, updatedAt: timestamp }] };
  const unavailable: AgentAdapterInfo[] = [
    { id: 'codex', name: 'Codex CLI', command: 'codex', available: false, reason: '浏览器演示模式不启动本机 Agent；请使用 npm run dev。', capabilities: { persistentSession: false, resumeSession: false, appendMessage: false, cancel: false, structuredOutput: false, fileModification: false, interAgentMessaging: false, approvalEvents: false, usage: false } },
    { id: 'claude', name: 'Claude Code', command: 'claude', available: false, reason: '浏览器演示模式不连接 CLI。', capabilities: { persistentSession: false, resumeSession: false, appendMessage: false, cancel: false, structuredOutput: false, fileModification: false, interAgentMessaging: false, approvalEvents: false, usage: false } }
  ];
  const sync = () => {
    project.continueCard.goal = project.goals.find((item) => item.status === 'active');
    project.continueCard.next = project.tasks.filter((item) => item.status === 'now' || item.status === 'next').slice(0, 3);
    project.continueCard.blockers = project.tasks.filter((item) => item.status === 'blocked');
    project.continueCard.importantComments = project.comments.filter((item) => item.status === 'open' && item.severity !== 'suggestion');
    const manuscript = [...seeded.files].filter(([path]) => path.startsWith('manuscript/')).map(([, content]) => content);
    project.manuscriptStats = { totalCharacters: manuscript.reduce((sum, content) => sum + content.replace(/\s/g, '').length, 0), targetCharacters: project.manifest.targetCharacters || 1_000_000, chapterCount: manuscript.length, progress: 0 };
    project.manuscriptStats.progress = Math.min(1, project.manuscriptStats.totalCharacters / project.manuscriptStats.targetCharacters);
  };
  const read = (path: string): FileReadResult => { const content = seeded.files.get(path); if (content === undefined) throw new Error(`演示文件不存在：${path}`); return { path, content, hash: hash(content), modifiedAt: timestamp, size: content.length }; };
  return {
    platform: 'browser' as NodeJS.Platform,
    chooseProject: async () => null,
    createProject: async (input) => { project = { ...project, root: `browser-preview://${input.title}`, manifest: { ...project.manifest, title: input.title, kind: input.kind, updatedAt: new Date().toISOString() } }; return clone(project); },
    openProject: async () => clone(project), addWork: async () => clone(project), activateWork: async () => clone(project), refreshProject: async () => { sync(); return clone(project); },
    readFile: async (path) => read(path),
    searchProject: async (query) => [...seeded.files].flatMap(([path, content]) => content.split('\n').map((line, index) => ({ path, line: index + 1, excerpt: line })).filter((item) => item.excerpt.toLowerCase().includes(query.toLowerCase()))).slice(0, 100),
    writeFile: async (input) => { seeded.files.set(input.path, input.content); const existing = project.files.find((item) => item.path === input.path); if (existing) Object.assign(existing, { size: input.content.length, modifiedAt: new Date().toISOString() }); else project.files.push(file(input.path, categoryForPath(input.path), input.content)); project.git.clean = false; if (!project.git.files.some((item) => item.path === input.path)) project.git.files.push({ path: input.path, index: ' ', workingTree: 'M', category: existing?.category || categoryForPath(input.path), origin: 'author' }); return read(input.path); },
    moveFile: async ({ from, to }) => { const content = seeded.files.get(from); if (content === undefined) throw new Error('源文件不存在'); if (seeded.files.has(to)) throw new Error('目标文件已经存在'); seeded.files.delete(from); seeded.files.set(to, content); const entry = project.files.find((item) => item.path === from); if (entry) Object.assign(entry, file(to, entry.category, content)); project.git.clean = false; project.git.files.push({ path: to, index: 'R', workingTree: ' ', category: entry?.category || 'other', origin: 'author' }); sync(); return clone(project); },
    repositoryInfo: async () => ({ root: project.root, branch: project.git.branch, head: 'demo123', clean: project.git.clean, changedFiles: project.git.files.length }),
    revealProjectFolder: async () => {},
    copyText: async () => {},
    analyzeTrash: async (input) => { const single = input.kind === 'file' || input.kind === 'chapter'; const files = [...seeded.files].filter(([filePath]) => single ? filePath === input.path : filePath.startsWith(`${input.path}/`)); const category = categoryForPath(files[0]?.[0] || input.path); return { kind: input.kind, category: category === 'other' || category === 'system' ? 'manuscript' : category, path: input.path, title: input.kind === 'work' ? project.manifest.works.find((work) => work.manuscriptRoot === input.path)?.title || input.path.split('/').at(-1)! : input.path.split('/').at(-1)!.replace(/\.[^.]+$/, ''), files: files.map(([filePath]) => filePath), characters: files.reduce((sum, [, content]) => sum + content.replace(/\s/g, '').length, 0), linkedFacts: project.facts.filter((fact) => fact.evidence.some((item) => files.some(([filePath]) => filePath === item.filePath))).length, linkedTasks: 1, linkedComments: 1, linkedAgents: 1, warnings: ['浏览器演示：所有作者内容都会进入可恢复回收站'] }; },
    trashProjectItem: async (input) => { const single = input.kind === 'file' || input.kind === 'chapter'; const impact = await (single ? Promise.resolve({ files: [input.path], title: input.path.split('/').at(-1)!.replace(/\.[^.]+$/, '') }) : Promise.resolve({ files: [...seeded.files.keys()].filter((filePath) => filePath.startsWith(`${input.path}/`)), title: input.kind === 'work' ? project.manifest.works.find((work) => work.manuscriptRoot === input.path)?.title || input.path.split('/').at(-1)! : input.path.split('/').at(-1)! })); if (input.confirmation !== impact.title) throw new Error(`请输入“${impact.title}”确认`); const payload = impact.files.map((filePath) => [filePath, seeded.files.get(filePath)!] as [string, string]); const category = categoryForPath(payload[0]?.[0] || input.path); const entry: TrashEntry & { payload: Array<[string, string]> } = { id: id('trash'), kind: input.kind, category: category === 'other' || category === 'system' ? 'manuscript' : category, originalPath: input.path, trashPath: `browser-trash://${input.path}`, title: impact.title, files: payload.length, characters: payload.reduce((sum, [, content]) => sum + content.replace(/\s/g, '').length, 0), createdAt: new Date().toISOString(), filePaths: impact.files, payload }; trashEntries.push(entry); for (const [filePath] of payload) seeded.files.delete(filePath); project.files = project.files.filter((item) => !payload.some(([filePath]) => filePath === item.path)); sync(); return { state: clone(project), entry: clone(entry) }; },
    listTrash: async () => clone(trashEntries.map(({ payload: _payload, ...entry }) => entry)),
    restoreTrash: async (trashId) => { const index = trashEntries.findIndex((item) => item.id === trashId); if (index < 0) throw new Error('回收站条目不存在'); const [entry] = trashEntries.splice(index, 1); for (const [filePath, content] of entry.payload) { seeded.files.set(filePath, content); project.files.push(file(filePath, entry.category || categoryForPath(filePath), content)); } sync(); return clone(project); },
    trashCurrentProject: async () => { throw new Error('浏览器演示不会移动真实仓库'); },
    createRecovery: async () => {}, listRecovery: async () => [], restoreRecovery: async () => read(chapterPath),
    appendEvent: async (type, payload, source: EventSource = 'system') => { if (type === 'fact.upsert') project.facts.push(payload as unknown as StoryFact); return { schemaVersion: 1, id: id('event'), type, createdAt: new Date().toISOString(), sessionId: 'browser-preview', source, payload } as NovelEvent; },
    gitStatus: async () => clone(project.git), gitDiff: async (path = chapterPath) => [{ path, staged: false, binary: false, patch: `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ 演示差异 @@\n+ 浏览器模式展示示例 diff` }], gitFileVersions: async (path) => ({ path, oldContent: path === chapterPath ? chapter.replace('雨从傍晚下到午夜', '雨下了一整夜') : '', newContent: seeded.files.get(path) || '', oldExists: path === chapterPath, newExists: seeded.files.has(path), binary: false }),
    gitCommit: async () => { throw new Error('浏览器演示模式不会执行 Git 提交。请使用 npm run dev 启动桌面端。'); },
    listAgents: async () => clone(unavailable), runAgent: async () => { throw new Error('浏览器演示模式不启动 Agent。'); }, runObserver: async () => { throw new Error('浏览器演示模式不启动 Observer。'); }, cancelAgent: async () => {}, stopAllAgents: async () => {}, sendAgentMessage: async () => { throw new Error('浏览器演示模式不续接 Agent。'); },
    createContextPack: async (input) => { const current = input.filePath && input.content !== undefined ? input.content : chapter; return { id: id('context'), task: input.task, createdAt: new Date().toISOString(), budget: input.budget || 28_000, characters: current.length, items: [{ id: 'context-current', kind: 'current-buffer', title: '当前缓冲区 · 第一章.md', source: input.filePath || chapterPath, content: current, reason: '任务直接作用的当前文本', characters: current.length, included: true }], gaps: ['这是浏览器内存演示，不读取真实仓库'] }; },
    observerSession: async (action) => { if (action === 'start') observer = { ...observer, active: true, startedAt: new Date().toISOString() }; if (action === 'stop') observer.active = false; return clone(observer); }, relocateComments: async () => clone(project.comments),
    commentFeedback: async (input) => { const comment = project.comments.find((item) => item.id === input.commentId)!; const statuses: Record<string, ObserverComment['status']> = { accept: 'accepted', reject: 'rejected', defer: 'deferred', review: 'review-requested', intentional: 'intentional' }; comment.status = statuses[input.action] || comment.status; comment.messages.push({ id: id('message'), source: 'author', body: input.reason || input.action, createdAt: new Date().toISOString() }); sync(); return clone(comment); },
    analyzeCanonImpact: async (input) => { const fact = project.facts.find((item) => item.id === input.factId)!; return { id: id('impact'), factId: fact.id, generatedAt: new Date().toISOString(), previous: { category: fact.category, subject: fact.subject, statement: fact.statement, status: fact.status }, proposed: { category: input.category, subject: input.subject, statement: input.statement }, affectedChapters: fact.evidence.map((item) => ({ filePath: item.filePath, matches: [fact.subject], excerpt: item.quote })), affectedPlans: [], relatedFactIds: [], relatedTaskIds: [], warnings: ['浏览器演示影响分析'] }; },
    updateTask: async (input) => { const current = input.id ? project.tasks.find((item) => item.id === input.id) : undefined; const next: CreativeTask = { ...(current || project.tasks[0]), ...input, id: input.id || id('task'), title: input.title || current?.title || '新任务', updatedAt: new Date().toISOString(), createdAt: current?.createdAt || new Date().toISOString() }; if (current) Object.assign(current, next); else project.tasks.push(next); sync(); return clone(next); },
    updateGoal: async (input) => { const current = input.id ? project.goals.find((item) => item.id === input.id) : undefined; const next: Goal = { ...(current || project.goals[0]), ...input, id: input.id || id('goal'), title: input.title || current?.title || '新目标', updatedAt: new Date().toISOString() }; if (current) Object.assign(current, next); else project.goals.push(next); sync(); return clone(next); },
    decideProposal: async (input) => { const proposal = project.proposals.find((item) => item.id === input.proposalId)!; proposal.status = input.decision === 'confirm' ? 'confirmed' : 'rejected'; proposal.selectedRouteId = input.routeId; proposal.selectedRouteIds = input.routeIds; proposal.updatedAt = new Date().toISOString(); return clone(proposal); },
    getAuthorProfile: async () => clone(profile), upsertStyleRule: async (input) => { const current = input.id ? profile.rules.find((item) => item.id === input.id) : undefined; const rule = { ...(current || profile.rules[0]), ...input, id: input.id || id('style'), text: input.text || current?.text || '新规则', updatedAt: new Date().toISOString(), createdAt: current?.createdAt || new Date().toISOString() }; if (current) Object.assign(current, rule); else profile.rules.push(rule); profile.updatedAt = new Date().toISOString(); return clone(profile); }, deleteStyleRule: async (styleId) => { profile.rules = profile.rules.filter((item) => item.id !== styleId); profile.updatedAt = new Date().toISOString(); return clone(profile); },
    exportAuthorProfile: async () => null, importAuthorProfile: async () => null,
    getSettings: async () => clone(settings), updateSettings: async (patch) => { settings = { ...settings, ...patch, autosave: { ...settings.autosave, ...patch.autosave }, recovery: { ...settings.recovery, ...patch.recovery }, observer: { ...settings.observer, ...patch.observer }, navigator: { ...settings.navigator, ...patch.navigator } }; return clone(settings); },
    getRecentProject: async () => project.root, updateBufferState: async () => {}, onAgentEvent: () => () => {}, onExternalFileChange: () => () => {}, onProjectChange: () => () => {}
  };
}
