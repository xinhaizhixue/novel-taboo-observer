import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AgentHub } from '../electron/main/agents/hub.js';
import { ContextAssembler } from '../electron/main/context.js';
import { ProjectService } from '../electron/main/project.js';
import { AuthorProfileStore } from '../electron/main/profile.js';
import { hashText } from '../electron/main/utils.js';

const root = process.argv[2];
if (!root) throw new Error('用法：npm run smoke:agent -- /path/to/novel-repo');
const project = new ProjectService('agent-smoke-session');
await project.open(root);
const appData = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-agent-smoke-'));
const hub = new AgentHub(appData, project, new AuthorProfileStore(appData));
const adapters = await hub.list();
const codex = adapters.find((item) => item.id === 'codex');
if (!codex?.available) throw new Error(codex?.reason || 'Codex CLI 不可用');
const file = await project.readFile('manuscript/第一章.md');
const context = await new ContextAssembler(project).build({ task: '检查开篇的人物动机、连续性和读者承诺', filePath: file.path, content: file.content, budget: 12_000 });
const only = process.env.SMOKE_ONLY;
if (only === 'navigator') await smokeNavigator();
else if (only === 'writer') await smokeWriter();
else {
  await smokeObserver();
  if (only !== 'observer') { await smokeWriter(); await smokeNavigator(); }
}

function waitForTerminal(label: string, taskId: () => string, timeoutMs: number) {
  const terminal = new Set(['completed', 'failed', 'cancelled', 'interrupted', 'awaiting-author']);
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { const id = taskId(); if (id) void hub.cancel(id).catch(() => {}); reject(new Error(`Codex ${label} 烟雾测试超时`)); }, timeoutMs);
    const unsubscribe = hub.subscribe((event) => {
      if (!taskId() || event.taskId !== taskId() || (event.type !== 'state' && event.type !== 'error')) return;
      const payload = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload) ? event.payload as Record<string, unknown> : {};
      const state = String(payload.state || '');
      if (!terminal.has(state)) return;
      clearTimeout(timer); unsubscribe();
      if (state === 'completed') resolve(); else reject(new Error(String(payload.error || `${label} ${state}`)));
    });
  });
}

async function smokeObserver() {
  let observerTaskId = '';
  const done = waitForTerminal('Observer', () => observerTaskId, 10 * 60_000);
  const task = await hub.runObserver({
    adapterId: 'codex',
    snapshot: { id: 'smoke-snapshot', filePath: file.path, content: file.content, hash: hashText(file.content), editorVersion: 1, createdAt: new Date().toISOString() },
    contextPack: context,
    mode: 'manual'
  });
  observerTaskId = task.id;
  process.stdout.write(`observer started ${task.id} with ${codex.version}\n`);
  await done;
  const state = await project.state();
  const completed = state.agentTasks.find((item) => item.id === task.id);
  if (completed?.state !== 'completed') throw new Error(completed?.error || `任务状态异常：${completed?.state}`);
  process.stdout.write(`observer completed; comments=${state.comments.length}; session=${completed.sessionId || 'none'}\n`);
}

async function smokeWriter() {
  let writerTaskId = '';
  const done = waitForTerminal('Writer', () => writerTaskId, 10 * 60_000);
  const writer = await hub.runTask({ adapterId: 'codex', role: 'writer', objective: '这是适配器烟雾测试：只在第一章末尾另起一行追加 HTML 注释 <!-- WRITER_SMOKE_OK -->，不要修改其他文字或文件。', scope: ['manuscript/第一章.md'], completionCriteria: ['目标注释已写入第一章', '没有修改其他文件'], contextPack: context, allowNetwork: false });
  writerTaskId = writer.id;
  process.stdout.write(`writer started ${writer.id}\n`);
  await done;
  const finalFile = await project.readFile('manuscript/第一章.md');
  const finalState = await project.state();
  const writerRecord = finalState.agentTasks.find((item) => item.id === writer.id);
  if (!finalFile.content.includes('<!-- WRITER_SMOKE_OK -->')) throw new Error('Writer 没有按要求修改授权正文');
  if (writerRecord?.state !== 'completed' || !writerRecord.changedFiles.includes('manuscript/第一章.md')) throw new Error(writerRecord?.error || 'Writer 文件变化未被工作台记录');
  process.stdout.write(`writer completed; changed=${writerRecord.changedFiles.join(',')}\n`);
}

async function smokeNavigator() {
  let navigatorTaskId = '';
  const navigatorDone = waitForTerminal('Navigator', () => navigatorTaskId, 10 * 60_000);
  const navigator = await hub.runTask({ adapterId: 'codex', role: 'architect', objective: '诊断主角为何会拆信，并给出 2～3 条真正不同的下一场景路线。不要改文件。', scope: ['planning', 'canon'], completionCriteria: ['给出可比较路线', '说明因果、代价、风险和后续影响'], contextPack: context, allowNetwork: false });
  navigatorTaskId = navigator.id;
  process.stdout.write(`navigator started ${navigator.id}\n`);
  await navigatorDone;
  const navigationState = await project.state();
  const proposal = navigationState.proposals.find((item) => item.sourceTaskId === navigator.id);
  if (!proposal || proposal.routes.length < 2) throw new Error('Navigator 没有产生可选择的结构化路线');
  process.stdout.write(`navigator completed; routes=${proposal.routes.length}; status=${proposal.status}\n`);
}
