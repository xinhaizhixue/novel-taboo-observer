import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fg from 'fast-glob';
import { AgentHub } from '../electron/main/agents/hub.js';
import { ContextAssembler } from '../electron/main/context.js';
import { AuthorProfileStore } from '../electron/main/profile.js';
import { ProjectService } from '../electron/main/project.js';
import { RecoveryStore } from '../electron/main/recovery.js';
import { DEFAULT_SETTINGS } from '../src/shared/constants.js';
import { exec, hashText, now, uid } from '../electron/main/utils.js';

const receiptRoot = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
const temp = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-cross-genre-'));
const root = path.join(temp, 'urban-mystery-series');
const cloneRoot = path.join(temp, 'fresh-clone');
const appData = path.join(temp, 'app-data');
const target = 'manuscript/work-2/第二章.txt';
const forbiddenGenreMarkers = ['江砚', '万劫铸身', '气血', '武道', '星兽', '锻骨', '断星远征'];

async function waitForTerminal(project: ProjectService, hub: AgentHub, taskId: string, timeoutMs = 10 * 60_000) {
  const terminal = new Set(['completed', 'failed', 'cancelled', 'interrupted', 'awaiting-author']);
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const record = (await project.state()).agentTasks.find((item) => item.id === taskId);
    if (record && terminal.has(record.state)) return record;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await hub.cancel(taskId).catch(() => {});
  throw new Error(`跨题材真实Agent任务超时：${taskId}`);
}

async function commit(message: string) {
  const status = (await exec('git', ['status', '--porcelain'], root)).stdout.trim();
  if (!status) return false;
  await exec('git', ['add', '--all'], root);
  await exec('git', ['commit', '-m', message], root);
  return true;
}

try {
  const project = new ProjectService('cross-genre-acceptance');
  let state = await project.create({ root, title: '雾港失踪档案', kind: 'series', idea: '都市悬疑：夜班调度员收到一封来自已停用地铁站的实时检修回执。', targetCharacters: 180_000 });
  await exec('git', ['config', 'user.name', 'Novel Observer Acceptance'], root);
  await exec('git', ['config', 'user.email', 'acceptance@local.invalid'], root);

  const firstWorkId = state.manifest.activeWorkId!;
  state = await project.addWork('凌晨三点的末班车');
  const secondWorkId = state.manifest.activeWorkId!;
  const opening = await project.readFile('manuscript/work-2/第一章.md');
  const openingContent = `# 第一章 停运站台的检修回执

凌晨三点十七分，地铁调度员林澄在停运线路上收到一条实时检修回执。发件设备登记于九年前拆除的雾港北站，回执却正确写出了今晚临时改过的列车编号。

她没有立刻报警，也没有删除消息。第一班巡检车将在四十分钟后经过相邻隧道；如果回执来自仍在运行的旧设备，擅自断电可能破坏现场。如果有人借旧设备求救，等待又可能让唯一窗口消失。

林澄先保存原始时钟、路由和签名，将北站标成“设备当前回应、来源与人员未知”。她决定先确认回执是否真的看见了今晚，而不是先猜发件人是谁。
`;
  await project.writeFile(opening.path, openingContent, opening.hash);
  await project.writeFile('manuscript/work-2/线索备忘.txt', '北站九年前停用。\n当前回执包含今晚临时列车编号。\n姓名、动机和是否有人在站内均未知。\n', undefined, true);

  const canon = await project.readFile('canon/故事正典.md');
  await project.writeFile(canon.path, `${canon.content}\n## 已确认人物与边界\n\n- 林澄：夜班调度员，只知道回执命中今晚列车编号。\n- 雾港北站：九年前停用，当前是否有人未知。\n- 不引入超自然解释；设备回应、伪造、人员求救三类候选并列。\n`, canon.hash);
  const planning = await project.readFile('planning/滚动规划.md');
  await project.writeFile(planning.path, `${planning.content}\n- 第二章：林澄用一次性挑战排除旧录音，同时发现回执来自站外转发。\n- 第三章：巡检车与调度中心对同一信号得到不同方向。\n`, planning.hash);

  const activeGoal = state.goals.find((item) => item.status === 'active');
  if (activeGoal) await project.eventStore.append('goal.upsert', { ...activeGoal, title: '完成都市悬疑系列首个设备回执闭环', description: '不依赖高武设定，让设备证据、人物知识边界和现实风险推动悬疑。', target: 'manuscript/work-2', updatedAt: now() } as never, 'author');
  const templateTask = state.tasks[0];
  if (!templateTask) throw new Error('跨题材项目没有默认任务');
  await project.eventStore.append('task.upsert', { ...templateTask, id: uid('task'), title: '续写第二章：一次性挑战排除旧录音', description: '只写都市悬疑，不引入超自然或武力体系；让技术证据改变人物选择。', status: 'now', kind: 'writing', assignee: 'writer', links: [opening.path, 'canon/故事正典.md', 'planning/滚动规划.md'], createdAt: now(), updatedAt: now() } as never, 'navigator');
  await project.eventStore.append('fact.upsert', { id: uid('fact'), category: 'knowledge', subject: '停运北站实时回执', statement: '回执正确包含今晚临时列车编号，只能排除纯旧录音；来源、转发和人员均未知。', status: 'author-confirmed', evidence: [{ filePath: opening.path, quote: '回执却正确写出了今晚临时改过的列车编号' }], updatedAt: now() } as never, 'author');
  await project.eventStore.append('project.position', { filePath: opening.path, stage: '都市悬疑设备证据开篇', focus: '续写第二章：一次性挑战排除旧录音' }, 'system');
  await commit('建立跨题材都市悬疑验收基线');

  state = await project.state();
  const profile = new AuthorProfileStore(appData);
  const hub = new AgentHub(appData, project, profile);
  const codex = (await hub.list()).find((item) => item.id === 'codex');
  if (!codex?.available) throw new Error(codex?.reason || 'Codex CLI不可用');
  const context = await new ContextAssembler(project).build({ task: state.continueCard.focus, filePath: opening.path, content: openingContent, budget: 16_000 });

  const writerTask = await hub.runTask({
    adapterId: 'codex',
    role: 'writer',
    objective: `只创建并完成 ${target}。这是现实向都市悬疑，不得出现高武、超自然、未来科技或当前验收小说的人物设定。承接第一章：林澄用本次随机挑战验证回执不是旧录音，但发现信号经站外设备转发。正文使用纯文本，不加Markdown标题，至少900个非空白字符；只修改指定文件。`,
    scope: [target],
    completionCriteria: ['只创建指定TXT正文', '至少900个非空白字符', '现实向都市悬疑且保持知识边界'],
    contextPack: context,
    allowNetwork: false
  });
  const writer = await waitForTerminal(project, hub, writerTask.id);
  if (writer.state !== 'completed') throw new Error(writer.error || `跨题材Writer终态：${writer.state}`);
  if (writer.changedFiles.length !== 1 || writer.changedFiles[0] !== target) throw new Error(`跨题材Writer越界：${writer.changedFiles.join('、')}`);
  const written = await project.readFile(target);
  const characters = written.content.replace(/\s/g, '').length;
  if (characters < 900) throw new Error(`跨题材TXT正文过短：${characters}`);
  const genreLeaks = forbiddenGenreMarkers.filter((marker) => written.content.includes(marker));
  if (genreLeaks.length) throw new Error(`跨题材正文混入高武验收标识：${genreLeaks.join('、')}`);
  const writerDiff = (await exec('git', ['status', '--short'], root)).stdout.trim().split(/\r?\n/).filter(Boolean);
  await commit('真实Codex续写都市悬疑TXT章节');

  const observerContext = await new ContextAssembler(project).build({ task: '审查都市悬疑第二章的因果、知识边界和线索公平性', filePath: target, content: written.content, budget: 16_000 });
  const commentCountBefore = (await project.state()).comments.length;
  const observerTask = await hub.runObserver({
    adapterId: 'codex',
    snapshot: { id: uid('cross-genre-snapshot'), filePath: target, content: written.content, hash: hashText(written.content), editorVersion: 1, createdAt: now() },
    contextPack: observerContext,
    mode: 'manual',
    question: '这是现实向都市悬疑。至少提出一条可逐字锚定的评论，重点检查因果、人物当时能知道什么、技术线索是否公平；不要改正文，不要引入高武或超自然。'
  });
  const observer = await waitForTerminal(project, hub, observerTask.id);
  if (observer.state !== 'completed') throw new Error(observer.error || `跨题材Observer终态：${observer.state}`);
  const afterObserver = await project.state();
  const newComments = afterObserver.comments.slice(commentCountBefore);
  if (!newComments.length || newComments.some((item) => item.anchor.filePath !== target || !written.content.includes(item.anchor.quote))) throw new Error('跨题材Observer没有生成有效TXT锚定评论');
  await commit('真实Codex审查都市悬疑TXT章节');

  const recoveryRoot = path.join(temp, 'recovery');
  const recovery = new RecoveryStore(recoveryRoot, async () => DEFAULT_SETTINGS);
  const original = await project.readFile(target);
  const unsaved = `${original.content}\n\n[未保存作者补充：不要提前确认失踪者身份。]\n`;
  await recovery.create(project.activeManifest.projectId, target, unsaved, 'cross-genre-unsaved', true);
  const external = await project.writeFile(target, `${original.content}\n\n[外部编辑：巡检车时间改为四十二分钟。]\n`, original.hash);
  if ('conflict' in external) throw new Error('跨题材外部编辑意外冲突');
  const conflict = await project.writeFile(target, unsaved, original.hash);
  if (!('conflict' in conflict)) throw new Error('跨题材TXT旧哈希没有触发冲突保护');
  const recoveryEntry = (await recovery.list(project.activeManifest.projectId, target))[0];
  const restored = await recovery.restore(project.activeManifest.projectId, recoveryEntry.id);
  if (restored.content !== unsaved) throw new Error('跨题材未保存缓冲恢复不一致');
  const reverted = await project.writeFile(target, original.content, external.hash);
  if ('conflict' in reverted || reverted.hash !== original.hash) throw new Error('跨题材TXT未恢复原始Agent正文');
  await commit('验证跨题材TXT恢复与冲突保护');

  await project.activateWork(firstWorkId);
  await project.activateWork(secondWorkId);
  await commit('验证跨题材系列作品切换');
  await exec('git', ['clone', '--local', '--no-hardlinks', root, cloneRoot], temp);
  const source = await project.state();
  const cloneProject = new ProjectService('cross-genre-fresh-clone');
  const clone = await cloneProject.open(cloneRoot);
  const cloneTxt = await cloneProject.readFile(target);
  const cloneAssertions = {
    title: clone.manifest.title === source.manifest.title,
    kind: clone.manifest.kind === 'series',
    works: clone.manifest.works.length === 2,
    activeWork: clone.manifest.activeWorkId === secondWorkId,
    txt: cloneTxt.content === original.content,
    goals: clone.goals.length === source.goals.length,
    tasks: clone.tasks.length === source.tasks.length,
    facts: clone.facts.length === source.facts.length,
    comments: clone.comments.length === source.comments.length,
    agentTasks: clone.agentTasks.length === source.agentTasks.length
  };
  if (Object.values(cloneAssertions).some((value) => !value)) throw new Error(`跨题材全新clone不一致：${JSON.stringify(cloneAssertions)}`);
  const novelFiles = await fg('.novel/**/*', { cwd: cloneRoot, onlyFiles: true, dot: true });
  const novelBodies = await Promise.all(novelFiles.map((file) => readFile(path.join(cloneRoot, file), 'utf8')));
  const credentialsAbsent = !novelBodies.some((body) => /OPENAI_API_KEY|ANTHROPIC_API_KEY|sk-[a-z0-9]{20,}/i.test(body));
  if (!credentialsAbsent) throw new Error('跨题材clone疑似携带Agent凭据');
  const clean = !(await exec('git', ['status', '--porcelain'], root)).stdout.trim();
  if (!clean) throw new Error('跨题材验收源仓库未保持干净');

  const receipt = {
    id: 'cross-genre-real-agent',
    status: 'passed',
    verifiedAt: now(),
    fixture: { title: source.manifest.title, genre: '现实向都市悬疑', kind: source.manifest.kind, works: source.manifest.works.map((work) => ({ title: work.title, manuscriptRoot: work.manuscriptRoot })) },
    writer: { adapter: codex.version, taskId: writer.id, target, characters, changedFiles: writer.changedFiles, diff: writerDiff },
    observer: { taskId: observer.id, comments: newComments.map((item) => ({ id: item.id, quote: item.anchor.quote, issueType: item.issueType })) },
    recovery: { conflictProtected: true, unsavedRestored: true, formalFileRestored: true, outsideRepository: !path.resolve(recoveryRoot).startsWith(`${path.resolve(root)}${path.sep}`) },
    portability: { cloneAssertions, credentialsAbsent },
    forbiddenGenreMarkersAbsent: true,
    sourceHead: (await exec('git', ['rev-parse', 'HEAD'], root)).stdout.trim(),
    sourceClean: clean
  };

  if (receiptRoot) {
    const receiptProject = new ProjectService('cross-genre-acceptance-receipt');
    await receiptProject.open(receiptRoot);
    await receiptProject.eventStore.append('acceptance.recorded', receipt as never, 'system');
  }
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} finally {
  if (process.env.KEEP_CROSS_GENRE_FIXTURE !== '1') await rm(temp, { recursive: true, force: true });
  else process.stderr.write(`跨题材验收目录已保留：${temp}\n`);
}
