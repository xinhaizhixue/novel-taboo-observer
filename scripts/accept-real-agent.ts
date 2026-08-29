import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AgentHub } from '../electron/main/agents/hub.js';
import { ContextAssembler } from '../electron/main/context.js';
import { AuthorProfileStore } from '../electron/main/profile.js';
import { ProjectService } from '../electron/main/project.js';
import { exists, hashText, now } from '../electron/main/utils.js';

const projectArgument = process.argv[2];
const directRoot = projectArgument ? path.resolve(projectArgument) : path.resolve(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen');
const workspaceRoot = projectArgument ? path.resolve(import.meta.dirname, '..', 'workspaces', projectArgument) : directRoot;
const root = projectArgument && !(await exists(directRoot)) && await exists(workspaceRoot) ? workspaceRoot : directRoot;
const mode = process.argv[3] || 'navigator';
if (!['navigator', 'observer', 'writer'].includes(mode)) throw new Error('模式必须是 navigator、observer 或 writer');

const project = new ProjectService(`real-agent-acceptance-${mode}`);
const initial = await project.open(root);
const filePath = process.env.REAL_AGENT_FILE || initial.continueCard.lastFile;
if (!filePath) throw new Error('项目没有当前正文文件');
const file = await project.readFile(filePath);
const appData = await mkdtemp(path.join(os.tmpdir(), `novel-observer-real-${mode}-`));
const profile = new AuthorProfileStore(appData);
if (initial.manifest.authorProfile?.snapshot) await profile.importSnapshot(initial.manifest.authorProfile.snapshot);
const hub = new AgentHub(appData, project, profile);
const codex = (await hub.list()).find((item) => item.id === 'codex');
if (!codex?.available) throw new Error(codex?.reason || 'Codex CLI不可用');
const context = await new ContextAssembler(project).build({ task: process.env.REAL_AGENT_OBJECTIVE || initial.continueCard.focus, filePath, content: file.content, budget: 28_000 });

async function waitForTerminal(taskId: string, timeoutMs = 10 * 60_000) {
  const terminal = new Set(['completed', 'failed', 'cancelled', 'interrupted', 'awaiting-author']);
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const record = (await project.state()).agentTasks.find((item) => item.id === taskId);
    if (record && terminal.has(record.state)) return record;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await hub.cancel(taskId).catch(() => {});
  throw new Error(`真实${mode}任务超时，已请求停止`);
}

if (mode === 'navigator') {
  const task = await hub.runTask({
    adapterId: 'codex',
    role: 'architect',
    objective: process.env.REAL_AGENT_OBJECTIVE || `诊断当前任务“${initial.continueCard.focus}”，给出2～4条真正不同的执行路线。每条必须说明因果、代价、风险、后续影响和首章目标；不得修改文件。`,
    scope: ['planning', 'canon', 'research', 'decisions'],
    completionCriteria: ['至少2条可比较路线', '每条路线包含因果、代价、风险和后续影响', '不修改任何文件'],
    contextPack: context,
    allowNetwork: false
  });
  const record = await waitForTerminal(task.id);
  if (record.state !== 'completed') throw new Error(record.error || `Navigator终态：${record.state}`);
  const state = await project.state();
  const proposal = state.proposals.find((item) => item.sourceTaskId === task.id);
  if (!proposal || proposal.routes.length < 2) throw new Error('Navigator未生成结构化多路线提案');
  const rejected = { ...proposal, status: 'rejected' as const, updatedAt: now() };
  await project.eventStore.append('proposal.updated', rejected as never, 'author');
  await project.eventStore.append('decision.recorded', { proposalId: proposal.id, decision: 'reject', reason: '当前滚动章纲已经作者确认；本次仅验收真实Agent路线闭环，不让新提案覆盖现行任务。', routeCount: proposal.routes.length }, 'author');
  process.stdout.write(`${JSON.stringify({ mode, adapter: codex.version, task: record, proposal: { id: proposal.id, routes: proposal.routes.map((route) => route.title), finalStatus: 'rejected' }, context: { characters: context.characters, budget: context.budget, included: context.items.filter((item) => item.included).map((item) => item.source) } }, null, 2)}\n`);
} else if (mode === 'observer') {
  const before = (await project.state()).comments.length;
  const observerMode = (process.env.REAL_OBSERVER_MODE || 'manual') as 'automatic' | 'manual' | 'selection' | 'review' | 'explain';
  const commentId = process.env.REAL_OBSERVER_COMMENT_ID;
  if ((observerMode === 'review' || observerMode === 'explain') && !commentId) throw new Error(`${observerMode}模式必须设置REAL_OBSERVER_COMMENT_ID`);
  const task = await hub.runObserver({
    adapterId: 'codex',
    snapshot: { id: `real-observer-${Date.now()}`, filePath, content: file.content, hash: hashText(file.content), editorVersion: 1, createdAt: now() },
    contextPack: context,
    mode: observerMode,
    commentId,
    question: process.env.REAL_AGENT_OBJECTIVE || '检查因果、知识边界、节奏、风格与下一章承诺；没有值得打断的问题可以返回空评论。'
  });
  const record = await waitForTerminal(task.id);
  if (record.state !== 'completed') throw new Error(record.error || `Observer终态：${record.state}`);
  const state = await project.state();
  process.stdout.write(`${JSON.stringify({ mode, observerMode, adapter: codex.version, task: record, reviewedComment: commentId ? state.comments.find((comment) => comment.id === commentId) : undefined, newComments: state.comments.slice(before).map((comment) => ({ id: comment.id, severity: comment.severity, summary: comment.summary, quote: comment.anchor.quote })) }, null, 2)}\n`);
} else {
  const target = process.env.REAL_AGENT_TARGET;
  if (!target) throw new Error('Writer模式必须通过REAL_AGENT_TARGET指定唯一正文文件');
  const minCharacters = Number(process.env.REAL_AGENT_MIN_CHARACTERS || 1_100);
  const maxCharacters = process.env.REAL_AGENT_MAX_CHARACTERS ? Number(process.env.REAL_AGENT_MAX_CHARACTERS) : undefined;
  if (!Number.isInteger(minCharacters) || minCharacters < 1) throw new Error('REAL_AGENT_MIN_CHARACTERS必须是正整数');
  if (maxCharacters !== undefined && (!Number.isInteger(maxCharacters) || maxCharacters < minCharacters)) throw new Error('REAL_AGENT_MAX_CHARACTERS必须是不小于最小字数的整数');
  const range = maxCharacters === undefined ? `至少${minCharacters}` : `${minCharacters}—${maxCharacters}`;
  const objective = process.env.REAL_AGENT_OBJECTIVE || `只创建并完成${target}，承接当前任务“${initial.continueCard.focus}”。正文${range}个非空白字符，遵守上下文与正典；不要修改其他文件。`;
  const task = await hub.runTask({
    adapterId: 'codex',
    role: 'writer',
    objective,
    creativeTaskId: process.env.REAL_AGENT_CREATIVE_TASK_ID,
    scope: [target],
    completionCriteria: ['仅修改指定正文文件', `正文${range}个非空白字符`, '与当前任务、正典和近期章节连续'],
    contextPack: context,
    allowNetwork: false
  });
  const record = await waitForTerminal(task.id);
  if (record.state !== 'completed') throw new Error(record.error || `Writer终态：${record.state}`);
  const written = await project.readFile(target);
  const characters = written.content.replace(/\s/g, '').length;
  if (characters < minCharacters) throw new Error(`Writer正文过短：${characters}，要求至少${minCharacters}`);
  if (maxCharacters !== undefined && characters > maxCharacters) throw new Error(`Writer正文过长：${characters}，要求不超过${maxCharacters}`);
  if (record.changedFiles.some((changed) => changed !== target) || !record.changedFiles.includes(target)) throw new Error(`Writer变化范围异常：${record.changedFiles.join('、')}`);
  process.stdout.write(`${JSON.stringify({ mode, adapter: codex.version, task: record, target, characterRange: { min: minCharacters, max: maxCharacters ?? null }, characters, hash: written.hash }, null, 2)}\n`);
}
