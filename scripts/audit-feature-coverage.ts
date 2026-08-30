import path from 'node:path';
import { ContextAssembler } from '../electron/main/context.js';
import { CodexAdapter } from '../electron/main/agents/codex.js';
import { ClaudeAdapter } from '../electron/main/agents/claude.js';
import { ProjectService } from '../electron/main/project.js';
import { exec, exists } from '../electron/main/utils.js';
import { policyAwareGitCoverage } from './feature-audit-policy.js';

type Status = 'verified-real' | 'verified-automated' | 'partial' | 'pending';
type Check = { id: string; requirement: string; status: Status; evidence: string[]; next?: string };

const projectArgument = process.argv[2];
const directRoot = projectArgument ? path.resolve(projectArgument) : path.resolve(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen');
const workspaceRoot = projectArgument ? path.resolve(import.meta.dirname, '..', 'workspaces', projectArgument) : directRoot;
const root = projectArgument && !(await exists(directRoot)) && await exists(workspaceRoot) ? workspaceRoot : directRoot;
const allowIncomplete = process.env.FEATURE_ALLOW_INCOMPLETE === '1';
const project = new ProjectService('feature-coverage-audit');
const state = await project.open(root);
const currentProjectLocalOnly = process.env.FEATURE_CURRENT_PROJECT_LOCAL_ONLY === '1' || state.manifest.gitPolicy === 'local-only';
const events = await project.eventStore.all();
const eventCounts = Object.fromEntries(Object.entries(Object.groupBy(events, (event) => event.type)).map(([type, items]) => [type, items?.length || 0]));
const acceptanceReceipts = new Map<string, Record<string, unknown>>();
const uiReceiptIds = new Set(['dev-web-interaction', 'desktop-macos-ui', 'author-ui-writing-flow', 'platform-deep-ui', 'author-style-ui', 'usability-lifecycle-v2', 'content-lifecycle-v3']);
for (const event of events.filter((item) => item.type === 'acceptance.recorded')) {
  const payload = event.payload as unknown as Record<string, unknown>;
  if (typeof payload.id !== 'string' || payload.status !== 'passed') continue;
  if (uiReceiptIds.has(payload.id) && payload.evidenceVersion !== 2) continue;
  acceptanceReceipts.set(payload.id, payload);
}
let commitCount = 0;
try {
  commitCount = Number((await exec('git', ['rev-list', '--count', 'HEAD'], root)).stdout.trim() || 0);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/ambiguous argument ['"]?HEAD|unknown revision|bad revision ['"]?HEAD/i.test(message)) throw error;
}
const adapters = await Promise.all([new CodexAdapter().info(), new ClaudeAdapter().info()]);
const lastFile = state.continueCard.lastFile;
const current = lastFile ? await project.readFile(lastFile) : undefined;
const contextPack = current ? await new ContextAssembler(project).build({ task: state.continueCard.focus, filePath: current.path, content: current.content, budget: 28_000 }) : undefined;
const includedKinds = new Set(contextPack?.items.filter((item) => item.included).map((item) => item.kind) || []);
const authorFeedbackComments = state.comments.filter((comment) => comment.messages.some((message) => message.source === 'author'));
const reviewedComments = state.comments.filter((comment) => comment.reviewCount > 0 && ['resolved', 'partial', 'unresolved', 'obsolete'].includes(comment.status));
const completedResearch = state.tasks.filter((task) => task.assignee === 'researcher' && task.status === 'completed');
const linkedStyleRules = (() => { try { return (JSON.parse(state.manifest.authorProfile?.snapshot || '{}') as { rules?: unknown[] }).rules || []; } catch { return []; } })();
const usabilityReceipt = acceptanceReceipts.get('usability-lifecycle-v2');
const contentLifecycleReceipt = acceptanceReceipts.get('content-lifecycle-v3');
const authorStyleReceipt = acceptanceReceipts.get('author-style-ui');
const crossGenreReceipt = acceptanceReceipts.get('cross-genre-real-agent');
const gitCoverage = policyAwareGitCoverage({
  currentProjectLocalOnly,
  currentCommitCount: commitCount,
  currentChapterCount: state.manuscriptStats.chapterCount,
  currentFileChanges: eventCounts['file.changed'] || 0,
  currentUiDiffVerified: acceptanceReceipts.has('author-ui-writing-flow'),
  fixtureGitCloneVerified: Boolean(crossGenreReceipt)
});
const positionEvents = events.filter((event) => event.type === 'project.position');
const positionKeys = new Set(positionEvents.map((event) => {
  const payload = event.payload as unknown as { filePath?: string; stage?: string; focus?: string };
  return JSON.stringify([payload.filePath, payload.stage, payload.focus]);
}));

const check = (id: string, requirement: string, status: Status, evidence: string[], next?: string): Check => ({ id, requirement, status, evidence, ...(next && status !== 'verified-real' ? { next } : {}) });
const automated = (id: string, requirement: string, evidence: string[], next: string) => check(id, requirement, 'verified-automated', evidence, next);

const checks: Check[] = [
  check('repo-git', 'Git仓库承载真实长篇作品并可显式检查点', gitCoverage.repoGit ? 'verified-real' : 'pending', [`branch=${state.git.branch}`, `commits=${commitCount}`, `chapters=${state.manuscriptStats.chapterCount}`, `characters=${state.manuscriptStats.totalCharacters}`, `currentProjectPolicy=${currentProjectLocalOnly ? 'local-only' : 'author-checkpoints'}`, `fixtureGitCloneVerified=${Boolean(crossGenreReceipt)}`]),
  check('structure-navigation', '作品/卷/章、计划、研究和决定可结构化导航', state.files.some((file) => file.category === 'planning') && state.files.some((file) => file.category === 'research') && state.files.some((file) => file.category === 'decision') ? 'verified-real' : 'pending', [`planning=${state.files.filter((file) => file.category === 'planning').length}`, `research=${state.files.filter((file) => file.category === 'research').length}`, `decisions=${state.files.filter((file) => file.category === 'decision').length}`]),
  check('continue-card', '打开后快速恢复当前目标、阶段和下一任务', state.continueCard.goal && state.continueCard.focus && state.continueCard.lastFile ? 'verified-real' : 'pending', [`goal=${state.continueCard.goal?.title || 'missing'}`, `focus=${state.continueCard.focus}`, `lastFile=${state.continueCard.lastFile || 'missing'}`]),
  check('story-memory', '人物/关系/时间线/知识/伏笔/规则等故事事实有来源地维护', state.facts.length > 0 ? 'verified-real' : 'pending', [`facts=${state.facts.length}`, `categories=${[...new Set(state.facts.map((fact) => fact.category))].sort().join(',')}`]),
  check('researcher', 'Researcher资产独立且不自动升级正典', completedResearch.length > 0 && state.files.some((file) => file.category === 'research') ? 'verified-real' : 'pending', [`completedResearchTasks=${completedResearch.length}`, `researchFiles=${state.files.filter((file) => file.category === 'research').length}`]),
  check('observer-loop', 'Observer锚定评论、作者反馈和修改后复查形成闭环', reviewedComments.length > 0 && authorFeedbackComments.length > 0 ? 'verified-real' : 'pending', [`comments=${state.comments.length}`, `reviewed=${reviewedComments.length}`, `withAuthorFeedback=${authorFeedbackComments.length}`]),
  check('author-style', '真实正文与反馈可提炼为有证据的风格候选，规则可确认、编辑、删除并迁移', authorStyleReceipt || usabilityReceipt ? 'verified-real' : linkedStyleRules.length ? 'partial' : 'pending', [`profileLinked=${Boolean(state.manifest.authorProfile)}`, `linkedRules=${linkedStyleRules.length}`, `memoryCuratorCompleted=${state.agentTasks.filter((task) => task.role === 'memory-curator' && task.state === 'completed').length}`, `author-profile.linked=${eventCounts['author-profile.linked'] || 0}`, `authorStyleUiReceipt=${Boolean(authorStyleReceipt)}`], '完成真实记忆整理员任务并在UI验证候选、编辑和删除'),
  check('context-pack', '真实长篇任务上下文包含当前正文、正典、计划和结构化状态且不超预算', contextPack && ['current-buffer', 'canon', 'planning', 'workbench-state'].every((kind) => includedKinds.has(kind)) && contextPack.characters <= contextPack.budget ? 'verified-real' : 'pending', [`characters=${contextPack?.characters || 0}/${contextPack?.budget || 0}`, `kinds=${[...includedKinds].sort().join(',')}`]),
  acceptanceReceipts.has('platform-deep-ui') ? check('deep-author-controls', '作者可调整真实Agent上下文、查看正典影响、逐段解决三方冲突并顺畅操作长篇导航/设置/任务', 'verified-real', [JSON.stringify(acceptanceReceipts.get('platform-deep-ui'))]) : automated('deep-author-controls', '作者可调整真实Agent上下文、查看正典影响、逐段解决三方冲突并顺畅操作长篇导航/设置/任务', ['tests/context-customization.test.ts', 'tests/canon-impact.test.ts', 'tests/three-way-merge.test.ts', 'tests/project.test.ts: 搜索文件名优先'], '在真实Electron界面完成深度作者控制闭环并保存platform-deep-ui回执'),
  check('git-review', '正文改动可经Git diff审查且只在明确命令下提交', gitCoverage.gitReview ? 'verified-real' : 'partial', [`commits=${commitCount}`, `file.changed=${eventCounts['file.changed'] || 0}`, `workingTreeClean=${state.git.clean}`, `currentProjectPolicy=${currentProjectLocalOnly ? 'local-only' : 'author-checkpoints'}`, `visibleDiffReceipt=${acceptanceReceipts.has('author-ui-writing-flow')}`], currentProjectLocalOnly ? '当前项目明确保持本地；如策略变化，再由作者显式建立检查点' : state.git.clean ? undefined : '完成当前写作批次后建立小说检查点，再重跑矩阵'),
  check('file-move', '章节可安全移动且事件可迁移', (eventCounts['file.moved'] || 0) > 0 ? 'verified-real' : 'verified-automated', [`file.moved=${eventCounts['file.moved'] || 0}`, 'tests/project.test.ts: 安全移动且不覆盖']),
  check('navigator-routes', '卡文诊断给多路线并支持选择/组合/拒绝后更新计划', state.proposals.length > 0 ? 'verified-real' : 'pending', [`persistedProposals=${state.proposals.length}`], '在真实小说上通过Navigator生成至少2条路线并完成一次选择/组合/拒绝闭环'),
  check('agent-writer', '通用Agent通过工作台Writer直接修改真实正文并记录任务/哈希/变更', state.agentTasks.some((task) => task.role === 'writer' && task.changedFiles.length > 0) ? 'verified-real' : 'pending', [`agentTasks=${state.agentTasks.length}`, `writerTasks=${state.agentTasks.filter((task) => task.role === 'writer').length}`, `codexAvailable=${adapters[0].available}`], '在非受限桌面环境完成一次真实Codex Writer任务并由Git diff审查'),
  check('agent-observer', '第二个独立Agent会话审查Writer结果并可反馈回Writer', state.agentTasks.some((task) => task.role === 'observer') ? 'verified-real' : state.comments.length ? 'partial' : 'pending', [`observerAgentTasks=${state.agentTasks.filter((task) => task.role === 'observer').length}`, `observerComments=${state.comments.length}`], '用工作台Agent桥接完成Observer任务，而非仅事件脚本'),
  check('agent-stop-recovery', 'Agent可停止、失败可见、中断后不默默重跑副作用', state.agentTasks.some((task) => ['cancelled', 'failed', 'interrupted'].includes(task.state)) ? 'verified-real' : 'verified-automated', [`terminalFailureTasks=${state.agentTasks.filter((task) => ['cancelled', 'failed', 'interrupted'].includes(task.state)).length}`, 'tests/agent-state.test.ts与tests/agent-adapters.test.ts'], '在真实桌面任务执行一次停止或中断恢复'),
  check('second-adapter', '第二通用Agent验证协议与降级机制', adapters[1].available && state.agentTasks.some((task) => task.adapterId === 'claude') || (!adapters[1].available && Boolean(adapters[1].reason) && acceptanceReceipts.has('desktop-macos-ui')) ? 'verified-real' : 'partial', [`claudeAvailable=${adapters[1].available}`, `claudeVersion=${adapters[1].version || 'not-installed'}`, `claudeTasks=${state.agentTasks.filter((task) => task.adapterId === 'claude').length}`, `reason=${adapters[1].reason || 'available'}`, `desktopDegradationVisible=${acceptanceReceipts.has('desktop-macos-ui')}`], adapters[1].available ? '用Claude Code完成真实任务' : '在真实桌面确认不可用原因与能力降级可见'),
  acceptanceReceipts.has('save-recovery-conflict') ? check('save-recovery-conflict', '手动/自动保存、仓库外恢复点及未保存缓冲冲突保护', 'verified-real', [JSON.stringify(acceptanceReceipts.get('save-recovery-conflict'))]) : automated('save-recovery-conflict', '手动/自动保存、仓库外恢复点及未保存缓冲冲突保护', ['tests/recovery.test.ts', 'tests/project.test.ts', 'scripts/exercise-recovery-conflict.ts'], '在真实正文上完成未保存恢复与冲突回执'),
  acceptanceReceipts.has('series-and-txt') ? check('series-and-txt', '系列多作品与Markdown/TXT编辑', 'verified-real', [JSON.stringify(acceptanceReceipts.get('series-and-txt'))]) : automated('series-and-txt', '系列多作品与Markdown/TXT编辑', ['tests/project.test.ts: 系列作品切换', 'SUPPORTED_TEXT_EXTENSIONS包含md/markdown/txt'], '创建真实系列仓库和TXT章节并保存回执'),
  acceptanceReceipts.has('cross-genre-real-agent') ? check('cross-genre-real-agent', '非高武、不同系列目录与TXT正文可真实运行Codex Writer/Observer、恢复、Git和clone', 'verified-real', [JSON.stringify(acceptanceReceipts.get('cross-genre-real-agent'))]) : check('cross-genre-real-agent', '非高武、不同系列目录与TXT正文可真实运行Codex Writer/Observer、恢复、Git和clone', 'pending', ['audit:generic只能证明核心未出现已知硬编码，不能替代第二题材真实运行'], '运行 npm run accept:cross-genre -- <receipt-repo> 并保存真实Agent回执'),
  acceptanceReceipts.has('cross-machine-clone') ? check('cross-machine', '换电脑/全新实例恢复正文、正典、任务、评论且不恢复凭据', 'verified-real', [JSON.stringify(acceptanceReceipts.get('cross-machine-clone'))]) : gitCoverage.crossMachine ? check('cross-machine', '换电脑/全新实例恢复正文、正典、任务、评论且不恢复凭据', 'verified-real', [`currentProjectPolicy=${currentProjectLocalOnly ? 'local-only' : 'author-checkpoints'}`, `crossGenreFixture=${JSON.stringify(crossGenreReceipt)}`]) : check('cross-machine', '换电脑/全新实例恢复正文、正典、任务、评论且不恢复凭据', state.comments.length > 0 && commitCount > 1 ? 'partial' : 'pending', ['tests/project.test.ts: 新实例重建', 'scripts/advance-high-wuxia.ts: 全量幂等恢复', `commits=${commitCount}`], '从小说Git克隆到全新目录，执行完整读回并保存验收回执'),
  acceptanceReceipts.has('desktop-macos-ui') ? check('desktop-macos-ui', '真实macOS Electron窗口可启动、交通灯不遮挡、关键页面点击不黑屏', 'verified-real', [JSON.stringify(acceptanceReceipts.get('desktop-macos-ui'))]) : check('desktop-macos-ui', '真实macOS Electron窗口可启动、交通灯不遮挡、关键页面点击不黑屏', 'pending', ['自动构建与browser-workbench测试不等于macOS真机点击'], '在非受限桌面环境完成截图与全页面点击回归'),
  acceptanceReceipts.has('author-ui-writing-flow') ? check('author-ui-writing-flow', '真实作者在Electron内完成定位、中文编辑、滚动、保存、Observer反馈复查与Git diff审查', 'verified-real', [JSON.stringify(acceptanceReceipts.get('author-ui-writing-flow'))]) : check('author-ui-writing-flow', '真实作者在Electron内完成定位、中文编辑、滚动、保存、Observer反馈复查与Git diff审查', 'pending', ['脚本与服务层回执不能替代可见UI作者流程'], '用一篇长章在Electron内完成全流程并保存验收回执'),
  acceptanceReceipts.has('dev-web-interaction') ? check('dev-web', 'dev:web浏览器演示不黑屏且明确不冒充真实仓库/Agent', 'verified-real', [JSON.stringify(acceptanceReceipts.get('dev-web-interaction'))]) : check('dev-web', 'dev:web浏览器演示不黑屏且明确不冒充真实仓库/Agent', 'verified-automated', ['tests/browser-workbench.test.ts', 'AppErrorBoundary与browser-workbench内存桥'], '在可绑定端口环境完成真实浏览器点击回归')
  , usabilityReceipt ? check('project-lifecycle-v2', '从任意项目可新建/打开作品、查看真实仓库信息，并安全删除/恢复章节、卷和仓库', 'verified-real', [JSON.stringify(usabilityReceipt)]) : automated('project-lifecycle-v2', '从任意项目可新建/打开作品、查看真实仓库信息，并安全删除/恢复章节、卷和仓库', ['tests/trash.test.ts', 'tests/project.test.ts: repositoryInfo', '作品中心与回收站UI'], '在真实Electron临时项目完成新建、软删除/恢复及整仓移入废纸篓'),
  contentLifecycleReceipt ? check('content-lifecycle-v3', '所有作者内容文件、目录和系列作品可统一软删除/恢复，结构化记录使用可审计状态语义', 'verified-real', [JSON.stringify(contentLifecycleReceipt)]) : automated('content-lifecycle-v3', '所有作者内容文件、目录和系列作品可统一软删除/恢复，结构化记录使用可审计状态语义', ['tests/trash.test.ts: 正文/大纲/研究/正典/决定/目录/系列作品', 'tests/canon-impact.test.ts: 事实废弃与恢复', 'FileTree所有内容组保留新建入口'], '在真实Electron临时系列仓库逐类删除并恢复，保存content-lifecycle-v3回执'),
  usabilityReceipt ? check('human-git-diff-v2', 'Git变更以成熟组件显示行号、增删色、split/unified，并把系统JSON翻译为事件摘要', 'verified-real', [JSON.stringify(usabilityReceipt)]) : automated('human-git-diff-v2', 'Git变更以成熟组件显示行号、增删色、split/unified，并把系统JSON翻译为事件摘要', ['@git-diff-view/react', 'GitDiffViewer.tsx', 'tests/project.test.ts: HEAD/工作区版本'], '在真实Electron与浏览器可见验证正文Diff和系统事件摘要'),
  usabilityReceipt ? check('information-architecture-v2', '评论和Agent只在右侧提供功能，左侧无重复空页面入口', 'verified-real', [JSON.stringify(usabilityReceipt)]) : automated('information-architecture-v2', '评论和Agent只在右侧提供功能，左侧无重复空页面入口', ['NAVIGATION不含agents/comments', '状态栏可展开右栏'], '真实点击导航与右栏确认无重复入口'),
  usabilityReceipt ? check('user-guidance-v2', '首次创作有分步引导，完整使用文档与页面内帮助覆盖常见操作和安全边界', 'verified-real', [JSON.stringify(usabilityReceipt)]) : automated('user-guidance-v2', '首次创作有分步引导，完整使用文档与页面内帮助覆盖常见操作和安全边界', ['docs/USER_GUIDE.md', 'HelpPanel.tsx', 'ContinuePanel onboarding'], '在真实Electron验证新手引导与帮助页'),
  usabilityReceipt ? check('visual-contrast-v2', '全部主页面和关键弹窗文字/按钮达到可读对比度，三张用户截图场景回归', 'verified-real', [JSON.stringify(usabilityReceipt)]) : automated('visual-contrast-v2', '全部主页面和关键弹窗文字/按钮达到可读对比度，三张用户截图场景回归', ['tests/contrast.test.ts', '全页面运行时对比度扫描'], '完成Electron截图与10页面/9弹窗对比度回归')
];

const summary = Object.fromEntries((['verified-real', 'verified-automated', 'partial', 'pending'] as const).map((status) => [status, checks.filter((item) => item.status === status).length]));
const report = {
  root,
  title: state.manifest.title,
  generatedAt: new Date().toISOString(),
  manuscript: { ...state.manuscriptStats, currentGoal: state.continueCard.goal?.title, currentTask: state.continueCard.focus },
  adapters: adapters.map((adapter) => ({ id: adapter.id, available: adapter.available, authenticated: adapter.authenticated, version: adapter.version, reason: adapter.reason, capabilities: adapter.capabilities })),
  currentProjectPolicy: { git: currentProjectLocalOnly ? 'local-only' : 'author-checkpoints' },
  dataHealth: { eventCounts, projectPosition: { total: positionEvents.length, unique: positionKeys.size, duplicateHistoricalRows: positionEvents.length - positionKeys.size }, warnings: state.dataWarnings },
  summary,
  checks
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (!allowIncomplete && checks.some((item) => item.status !== 'verified-real')) {
  process.stderr.write('真实功能验收尚未完成；使用 FEATURE_ALLOW_INCOMPLETE=1 查看阶段性矩阵。\n');
  process.exitCode = 2;
}
