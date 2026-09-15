import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ClaudeAdapter } from '../electron/main/agents/claude.js';
import { CodexAdapter } from '../electron/main/agents/codex.js';
import { AgentHub } from '../electron/main/agents/hub.js';
import { ContextAssembler } from '../electron/main/context.js';
import { AuthorProfileStore } from '../electron/main/profile.js';
import { hashText } from '../electron/main/utils.js';
import { ProjectService } from '../electron/main/project.js';
import type { AgentEvent, AgentTaskRecord } from '../src/shared/types.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function fakeCli(kind: 'codex' | 'claude') {
  const directory = await mkdtemp(path.join(os.tmpdir(), `novel-observer-${kind}-cli-`));
  roots.push(directory);
  const command = path.join(directory, `fake-${kind}`);
  const logPath = path.join(directory, 'calls.jsonl');
  const observerOutput = JSON.stringify({
    summary: 'fake observer result', reviewResult: 'not-applicable',
    comments: [{ issueType: '因果连续性', severity: 'warning', summary: '重复问题', evidence: '重复证据', suggestedAction: '补足连接', quote: '锚点文本', start: 0, end: 4 }]
  });
  const script = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const logPath = ${JSON.stringify(logPath)};
function log(prompt = '') { fs.appendFileSync(logPath, JSON.stringify({ args, prompt, cwd: process.cwd() }) + '\\n'); }
if (args[0] === '--version') { log(); process.stdout.write(${JSON.stringify(kind === 'codex' ? 'codex-cli fake-1.0\n' : 'claude fake-1.0\n')}); process.exit(0); }
${kind === 'codex' ? `if (args[0] === 'login' && args[1] === 'status') { log(); process.stdout.write('Logged in\\n'); process.exit(0); }` : ''}
${kind === 'codex' ? `if (args[0] === 'debug' && args[1] === 'models' && args[2] === '--bundled') { log(); process.stdout.write(JSON.stringify({ models: [{ slug: 'gpt-5.6-luna' }, { slug: 'gpt-5.5' }] })); process.exit(0); }` : ''}
${kind === 'claude' ? `if (args[0] === 'auth') { log(); process.stdout.write(JSON.stringify({loggedIn:false})); process.exit(0); }` : ''}
function finish(prompt) {
  log(prompt);
  if (prompt.includes('你是第一次阅读这篇小说')) {
    const matches = [...prompt.matchAll(/### ([^\\n]+)\\n([\\s\\S]*?)(?=\\n\\n### |$)/g)];
    const result = JSON.stringify({ readings: matches.map(m => ({ filePath: m[1], quote: m[2].trim(), understanding: '已逐段阅读。', frictions: [] })) });
    const out = args.indexOf('-o'); if (out >= 0) fs.writeFileSync(args[out + 1], result);
    process.stdout.write(JSON.stringify({ type: 'result', session_id: 'cold-session', result }) + String.fromCharCode(10));
    return;
  }
  if (prompt.includes('FAKE_THINKING')) { process.stdout.write(JSON.stringify({type:'system',subtype:'thinking_tokens'})+String.fromCharCode(10));setTimeout(()=>process.stdout.write(JSON.stringify({type:'result',result:'finished'})+String.fromCharCode(10)),1500);return; }
  if (prompt.includes('FAKE_STRUCTURED_OUTPUT')) { process.stdout.write(JSON.stringify({type:'result',result:'',structured_output:{checked:true}})+String.fromCharCode(10));return; }
  if (prompt.includes('FAKE_RESULT_ERROR')) { process.stdout.write(JSON.stringify({type:'result',is_error:true,result:'model failed'})+String.fromCharCode(10));return; }
  if (prompt.includes('FAKE_NEWER_CLI_REQUIRED')) { process.stdout.write(JSON.stringify({ type: 'turn.failed', error: { message: 'The configured model requires a newer version of Codex. Please upgrade to the latest app or CLI and try again.' } }) + '\\n'); process.exit(1); }
  if (prompt.includes('FAKE_FAIL')) { process.stderr.write('authentication expired\\n'); process.exit(5); }
  if (prompt.includes('FAKE_MODEL_REFRESH_STALL')) { process.stderr.write('ERROR failed to refresh available models: timeout waiting for child process to exit\\n'); setInterval(() => {}, 1000); return; }
  if (prompt.includes('FAKE_MODEL_REFRESH_RECOVERS')) {
    process.stderr.write('ERROR failed to refresh available models: timeout waiting for child process to exit\\n');
    setTimeout(() => {
      const outputIndex = args.indexOf('-o');
      if (outputIndex >= 0) { fs.mkdirSync(path.dirname(args[outputIndex + 1]), { recursive: true }); fs.writeFileSync(args[outputIndex + 1], 'FAKE_CODEX_RECOVERED'); }
      process.stdout.write(JSON.stringify({ type: 'thread.started', thread_id: 'fake-recovered-session' }) + '\\n');
      process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'recovered' } }) + '\\n');
    }, 50);
    return;
  }
  if (prompt.includes('FAKE_SESSION_WAIT')) {
    const target = path.join(process.cwd(), 'manuscript', '中断.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '中断时也要保留正文');
    ${kind === 'codex' ? `process.stdout.write(JSON.stringify({ type: 'thread.started', thread_id: 'fake-interrupted-session' }) + '\\n'); process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'file_change', status: 'completed', changes: [{ path: target, kind: 'add' }] } }) + '\\n');` : `process.stdout.write(JSON.stringify({ type: 'system', session_id: 'fake-interrupted-session' }) + '\\n');`}
    setInterval(() => {}, 1000);
    return;
  }
  if (prompt.includes('FAKE_WAIT')) { process.stderr.write('FAKE_WAIT_STARTED\\n'); setInterval(() => {}, 1000); return; }
  if (prompt.includes('FAKE_OBSERVER_JSON')) {
    const outputIndex = args.indexOf('-o');
    if (outputIndex >= 0) { fs.mkdirSync(path.dirname(args[outputIndex + 1]), { recursive: true }); fs.writeFileSync(args[outputIndex + 1], ${JSON.stringify(observerOutput)}); }
    ${kind === 'codex' ? `process.stdout.write(JSON.stringify({ type: 'thread.started', thread_id: 'fake-observer-session' }) + String.fromCharCode(10)); process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'observer done' } }) + String.fromCharCode(10));` : `process.stdout.write(JSON.stringify({ type: 'system', session_id: 'fake-observer-session' }) + String.fromCharCode(10)); process.stdout.write(JSON.stringify({ type: 'result', session_id: 'fake-observer-session', result: ${JSON.stringify(observerOutput)} }) + String.fromCharCode(10));`}
    return;
  }
  if (prompt.includes('FAKE_WRITE')) {
    const target = path.join(process.cwd(), 'manuscript', '第一章.md');
    fs.appendFileSync(target, '\\n<!-- FAKE_AGENT_WRITE -->\\n');
  }
  ${kind === 'codex' ? `
  const outputIndex = args.indexOf('-o');
  if (outputIndex >= 0) { fs.mkdirSync(path.dirname(args[outputIndex + 1]), { recursive: true }); fs.writeFileSync(args[outputIndex + 1], 'FAKE_CODEX_DONE'); }
  process.stdout.write(JSON.stringify({ type: 'thread.started', thread_id: 'fake-codex-session' }) + '\\n');
  if (prompt.includes('FAKE_WRITE')) process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'file_change', status: 'completed', changes: [{ path: path.join(process.cwd(), 'manuscript', '第一章.md'), kind: 'update' }] } }) + '\\n');
  process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'done' } }) + '\\n');
  ` : `
  process.stdout.write(JSON.stringify({ type: 'system', session_id: 'fake-claude-session' }) + '\\n');
  process.stdout.write(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'working' }] } }) + '\\n');
  process.stdout.write(JSON.stringify({ type: 'result', session_id: 'fake-claude-session', result: 'FAKE_CLAUDE_DONE' }) + '\\n');
  `}
}
${kind === 'codex' ? `let prompt = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', (chunk) => { prompt += chunk; }); process.stdin.on('end', () => finish(prompt));` : `finish(args[args.indexOf('-p') + 1] || '');`}
`;
  await writeFile(command, script, { mode: 0o755 });
  await chmod(command, 0o755);
  return { command, logPath };
}

async function calls(logPath: string) {
  const body = await readFile(logPath, 'utf8');
  return body.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line) as { args: string[]; prompt: string; cwd: string });
}

async function waitForRecord(project: ProjectService, taskId: string, expected: AgentTaskRecord['state'][], timeout = 3000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const record = (await project.state()).agentTasks.find((item) => item.id === taskId);
    if (record && expected.includes(record.state)) return record;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`等待 Agent 任务 ${taskId} 超时`);
}

async function waitForText(filePath: string, expected: string, timeout = 3000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { if ((await readFile(filePath, 'utf8')).includes(expected)) return; } catch { /* not created yet */ }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`等待日志 ${filePath} 写入 ${expected} 超时`);
}

describe('真实 CLI 子进程适配器', () => {
  it('Codex 支持检测、JSONL、输出文件与 resume，且续接不再传入不支持的 --color', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-codex-adapter-root-'));
    roots.push(root);
    const { command, logPath } = await fakeCli('codex');
    const adapter = new CodexAdapter(command, false);
    await expect(adapter.info()).resolves.toMatchObject({ available: true, authenticated: true, version: 'codex-cli fake-1.0' });
    const events: AgentEvent[] = [];
    const outputPath = path.join(root, 'first.txt');
    const first = adapter.run({ taskId: 'first', root, prompt: 'hello', readOnly: true, outputPath, networkAccess: true, emit: (event) => events.push(event) });
    await expect(first.completed).resolves.toMatchObject({ sessionId: 'fake-codex-session', finalMessage: 'FAKE_CODEX_DONE', exitCode: 0 });
    expect(events.some((event) => event.type === 'message')).toBe(true);
    const resumed = adapter.run({ taskId: 'resume', root, prompt: 'continue', readOnly: true, outputPath: path.join(root, 'resume.txt'), sessionId: 'fake-codex-session', emit: () => {} });
    await expect(resumed.completed).resolves.toMatchObject({ sessionId: 'fake-codex-session', exitCode: 0 });
    const invocations = await calls(logPath);
    expect(invocations.find((item) => item.prompt === 'hello')?.args.join(' ')).toContain('sandbox_workspace_write.network_access=true');
    const resume = invocations.find((item) => item.args.includes('resume'));
    expect(resume?.args).toContain('fake-codex-session');
    expect(resume?.args).not.toContain('--color');
    expect(resume?.prompt).toBe('continue');
  });

  it('Codex 已登录但状态目录只读时在启动前明确降级', async () => {
    const { command, logPath } = await fakeCli('codex');
    const stateDirectory = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-codex-readonly-'));
    roots.push(stateDirectory);
    await chmod(stateDirectory, 0o500);
    const info = await new CodexAdapter(command, true, stateDirectory).info();
    expect(info).toMatchObject({ available: false, authenticated: true });
    expect(info.reason).toContain('运行状态目录不可写');
    await chmod(stateDirectory, 0o700);
  });

  it('Codex 模型目录刷新报错可恢复；只有启动总超时才停止真正卡住的进程', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-codex-stall-'));
    roots.push(root);
    const { command } = await fakeCli('codex');
    const adapter = new CodexAdapter(command, false);
    const recoveredEvents: AgentEvent[] = [];
    const recovered = adapter.run({
      taskId: 'recover', root, prompt: 'FAKE_MODEL_REFRESH_RECOVERS', readOnly: true, outputPath: path.join(root, 'recover.txt'),
      startupTimeoutMs: 3_000, emit: (event) => recoveredEvents.push(event)
    });
    await expect(recovered.completed).resolves.toMatchObject({ exitCode: 0, finalMessage: 'FAKE_CODEX_RECOVERED' });
    expect(recoveredEvents.some((event) => event.type === 'message' && JSON.stringify(event.payload).includes('继续等待'))).toBe(true);
    expect(recoveredEvents.some((event) => event.type === 'error')).toBe(false);

    const persisted: string[] = [];
    const events: AgentEvent[] = [];
    const run = adapter.run({
      taskId: 'stall', root, prompt: 'FAKE_MODEL_REFRESH_STALL', readOnly: true, outputPath: path.join(root, 'stall.txt'),
      startupTimeoutMs: 2_000, recordRaw: (line) => persisted.push(line), emit: (event) => events.push(event)
    });
    await expect(run.completed).resolves.toMatchObject({ exitCode: 124 });
    expect(persisted.join('\n')).toContain('failed to refresh available models');
    expect(events.some((event) => event.type === 'message' && JSON.stringify(event.payload).includes('继续等待'))).toBe(true);
    expect(events.some((event) => event.type === 'error' && String(event.payload).includes('启动超过'))).toBe(true);
  }, 10_000);

  it('Claude 支持流式结果、resume，并把 stderr 实时转成事件', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-claude-adapter-root-'));
    roots.push(root);
    const { command, logPath } = await fakeCli('claude');
    const adapter = new ClaudeAdapter(command, false);
    await expect(adapter.info()).resolves.toMatchObject({ available: true, version: 'claude fake-1.0' });
    const events: AgentEvent[] = [];
    const first = adapter.run({ taskId: 'claude', root, prompt: 'hello', readOnly: true, outputPath: path.join(root, 'claude.txt'), emit: (event) => events.push(event) });
    await expect(first.completed).resolves.toMatchObject({ sessionId: 'fake-claude-session', finalMessage: 'FAKE_CLAUDE_DONE', exitCode: 0 });
    expect(events.some((event) => event.type === 'message')).toBe(true);
    const failed = adapter.run({ taskId: 'claude-error', root, prompt: 'FAKE_FAIL', readOnly: true, outputPath: path.join(root, 'failed.txt'), sessionId: 'fake-claude-session', emit: (event) => events.push(event) });
    await expect(failed.completed).resolves.toMatchObject({ exitCode: 5 });
    expect(events.some((event) => event.type === 'raw' && String(event.payload).includes('authentication expired'))).toBe(true);
    const invocations = await calls(logPath);
    expect(invocations.some((item) => item.args.includes('--resume') && item.args.includes('fake-claude-session'))).toBe(true);
  });

  it('Claude 已安装但没有登录时在任务前明确降级', async () => {
    const { command } = await fakeCli('claude');
    const info = await new ClaudeAdapter(command, true).info();
    expect(info).toMatchObject({ available: false, authenticated: false });
    expect(info.reason).toContain('尚未登录');
  });

  it('AgentHub 通过真实 Codex 子进程记录文件变化、失败和取消', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-real-agent-project-'));
    const appData = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-real-agent-data-'));
    roots.push(root, appData);
    const { command, logPath } = await fakeCli('codex');
    const project = new ProjectService('real-agent-process');
    await project.create({ root, title: '真实进程桥接', kind: 'novel' });
    await mkdir(path.join(root, 'manuscript'), { recursive: true });
    await project.writeFile('manuscript/第一章.md', '# 第一章\n');
    const hub = new AgentHub(appData, project, new AuthorProfileStore(appData), [new CodexAdapter(command, false)]);
    const agentEvents: AgentEvent[] = [];
    hub.subscribe((event) => agentEvents.push(event));

    const writer = await hub.runTask({ adapterId: 'codex', role: 'writer', objective: 'FAKE_WRITE', scope: ['manuscript/第一章.md'], completionCriteria: ['写入标记'] });
    const completed = await waitForRecord(project, writer.id, ['completed']);
    expect(completed.changedFiles).toContain('manuscript/第一章.md');
    expect(Object.keys(completed.startHashes)).toEqual(['manuscript/第一章.md']);
    expect((await project.readFile('manuscript/第一章.md')).content).toContain('FAKE_AGENT_WRITE');
    expect(completed.verifiedTextFiles).toEqual([expect.objectContaining({ path: 'manuscript/第一章.md', nonWhitespaceCharacters: 27 })]);
    expect(agentEvents.some((event) => event.type === 'file-change')).toBe(true);
    const positionAfterWriter = (await project.state()).continueCard;
    expect(positionAfterWriter.lastFile).toBe('manuscript/第一章.md');
    expect(positionAfterWriter.stage).toBe('逐章创作、观察和修订');
    expect(positionAfterWriter.focus).toContain('审查第一章并推进下一章');
    expect(project.activeManifest.works[0].status).toBe('serializing');
    const writerCall = (await calls(logPath)).find((call) => call.prompt.includes('FAKE_WRITE'));
    expect(writerCall?.args.join(' ')).toContain('model_reasoning_effort="medium"');

    await hub.sendMessage(writer.id, 'FAKE_WAIT');
    const resumedRunning = await waitForRecord(project, writer.id, ['running']);
    expect(resumedRunning.error).toBeUndefined();
    expect(resumedRunning.finalMessage).toBeUndefined();
    await hub.cancel(writer.id);
    await waitForRecord(project, writer.id, ['cancelled']);

    const liveObserver = await hub.runTask({ adapterId: 'codex', role: 'observer', objective: 'FAKE_WAIT first observer', scope: ['manuscript/第一章.md'], completionCriteria: [] });
    await waitForText(path.join(appData, 'agents', project.activeManifest.projectId, liveObserver.id, 'events.jsonl'), 'FAKE_WAIT_STARTED');
    await expect(hub.runTask({ adapterId: 'codex', role: 'observer', objective: 'FAKE_WAIT second observer', scope: ['manuscript/第一章.md'], completionCriteria: [] })).rejects.toThrow('已经在运行');
    await hub.cancel(liveObserver.id);
    await waitForRecord(project, liveObserver.id, ['cancelled']);

    const observerContent = '锚点文本 FAKE_OBSERVER_JSON';
    await project.writeFile('manuscript/第一章.md', observerContent);
    const observerContext = await new ContextAssembler(project).build({ task: 'FAKE_OBSERVER_JSON', filePath: 'manuscript/第一章.md', content: observerContent });
    for (const id of ['dedupe-one', 'dedupe-two']) {
      const observer = await hub.runObserver({
        adapterId: 'codex', snapshot: { id, filePath: 'manuscript/第一章.md', content: observerContent, hash: hashText(observerContent), editorVersion: 1, createdAt: new Date().toISOString() }, contextPack: observerContext, mode: 'manual'
      });
      await waitForRecord(project, observer.id, ['completed']);
    }
    const duplicateComments = (await project.state()).comments.filter((comment) => comment.summary === '重复问题');
    expect(duplicateComments).toHaveLength(1);
    expect(duplicateComments[0].messages.some((message) => message.body === '再次检查仍发现同一问题。')).toBe(true);

    const failed = await hub.runTask({ adapterId: 'codex', role: 'observer', objective: 'FAKE_FAIL', scope: ['manuscript/第一章.md'], completionCriteria: [] });
    const failedRecord = await waitForRecord(project, failed.id, ['failed']);
    expect(failedRecord.error).toContain('尚未登录');
    expect(failedRecord.startHashes).toEqual({});
    const observerCall = (await calls(logPath)).find((call) => call.prompt.includes('FAKE_FAIL'));
    expect(observerCall?.args).toContain('--ignore-user-config');
    expect(observerCall?.args).not.toContain('--model');
    expect(observerCall?.args.join(' ')).toContain('model_reasoning_effort="low"');

    const incompatible = await hub.runTask({ adapterId: 'codex', role: 'writer', objective: 'FAKE_NEWER_CLI_REQUIRED', scope: ['manuscript/第一章.md'], completionCriteria: [] });
    const incompatibleRecord = await waitForRecord(project, incompatible.id, ['failed']);
    expect(incompatibleRecord.error).toContain('Codex CLI 版本过旧');
    expect(incompatibleRecord.changedFiles).toEqual([]);
    expect((await calls(logPath)).filter((call) => call.prompt.includes('FAKE_NEWER_CLI_REQUIRED'))).toHaveLength(1);

    const style = await hub.runTask({ adapterId: 'codex', role: 'memory-curator', objective: 'FAKE_FAIL_STYLE', scope: ['planning', 'canon'], completionCriteria: [] });
    await waitForRecord(project, style.id, ['failed']);
    const styleCall = (await calls(logPath)).find((call) => call.prompt.includes('FAKE_FAIL_STYLE'));
    expect(styleCall?.args).toContain('--ignore-user-config');
    expect(styleCall?.args).not.toContain('--model');
    expect(styleCall?.args.join(' ')).toContain('model_reasoning_effort="low"');

    const waiting = await hub.runTask({ adapterId: 'codex', role: 'writer', objective: 'FAKE_WAIT', scope: ['manuscript/等待.md'], completionCriteria: [] });
    const liveLog = path.join(appData, 'agents', project.activeManifest.projectId, waiting.id, 'events.jsonl');
    await waitForText(liveLog, 'FAKE_WAIT_STARTED');
    await hub.cancel(waiting.id);
    const cancelled = await waitForRecord(project, waiting.id, ['cancelled']);
    expect(cancelled.error).toContain('作者停止');
    const writerRuns = (await calls(logPath)).filter((call) => call.prompt.includes('FAKE_WAIT') && !call.prompt.includes('first observer'));
    expect(writerRuns.length).toBeGreaterThanOrEqual(2);
    expect(writerRuns.every((call) => call.args.join(' ').includes('model_reasoning_effort="medium"'))).toBe(true);

    const recoveryCreativeTask = {
      id: 'creative-recovery', title: '恢复中断正文', description: '验证中断恢复', level: 'chapter' as const, status: 'now' as const, kind: 'writing' as const, assignee: 'writer' as const, source: 'navigator' as const, priority: 'high' as const,
      whyNow: '正文已经部分落盘，需要从同一会话继续。', known: [], missingDecisions: [], aiPreAnalysis: '', authorDecision: '', agentWork: '', completionCriteria: [], links: [], dependencies: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    await project.eventStore.append('task.upsert', recoveryCreativeTask as never, 'navigator');
    const recoverable = await hub.runTask({ adapterId: 'codex', role: 'writer', objective: 'FAKE_SESSION_WAIT', creativeTaskId: recoveryCreativeTask.id, scope: ['manuscript/中断.md'], completionCriteria: [] });
    const recoverableLog = path.join(appData, 'agents', project.activeManifest.projectId, recoverable.id, 'events.jsonl');
    await waitForText(recoverableLog, 'fake-interrupted-session');
    await hub.cancel(recoverable.id);
    const interrupted = await waitForRecord(project, recoverable.id, ['cancelled']);
    expect(interrupted.sessionId).toBe('fake-interrupted-session');
    expect(interrupted.changedFiles).toContain('manuscript/中断.md');
    expect(interrupted.verifiedTextFiles).toEqual([expect.objectContaining({ path: 'manuscript/中断.md', nonWhitespaceCharacters: 9 })]);
    const blockedCreativeTask = (await project.state()).tasks.find((task) => task.id === recoveryCreativeTask.id);
    expect(blockedCreativeTask).toMatchObject({ status: 'blocked', whyNow: recoveryCreativeTask.whyNow });
    expect(blockedCreativeTask?.cancellationReason).toContain('作者停止');
    await hub.sendMessage(recoverable.id, 'finish recovered task');
    await waitForRecord(project, recoverable.id, ['completed']);
    const completedCreativeTask = (await project.state()).tasks.find((task) => task.id === recoveryCreativeTask.id);
    expect(completedCreativeTask).toMatchObject({ status: 'now', whyNow: recoveryCreativeTask.whyNow });
    expect(completedCreativeTask?.agentWork).toContain('尚待文学审阅');
    expect(completedCreativeTask?.cancellationReason).toBeUndefined();
    const recoveryCall = (await calls(logPath)).find((call) => call.prompt === 'finish recovered task');
    expect(recoveryCall?.args).toContain('fake-interrupted-session');
  });
});

it('显式任务模型作为独立CLI参数传入，不改全局配置也不被轻量回退覆盖', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'novel-explicit-model-')); roots.push(root);
  const { command, logPath } = await fakeCli('codex');
  const adapter = new CodexAdapter(command, false);
  await adapter.info();
  const run = adapter.run({ taskId: 'selected-model', root, prompt: 'TASK_MODEL_SELECTION', model: 'gpt-6-astra', reasoningEffort: 'high', readOnly: true, ignoreUserConfig: true, outputPath: path.join(root, 'final.txt'), emit: () => {} });
  await run.completed;
  const call = (await calls(logPath)).find((item) => item.prompt === 'TASK_MODEL_SELECTION')!;
  expect(call.args.slice(call.args.indexOf('--model'), call.args.indexOf('--model') + 2)).toEqual(['--model', 'gpt-6-astra']);
  expect(call.args.join(' ')).toContain('model_reasoning_effort="high"');
});

it('Claude structured_output 正确交付，result.is_error 不冒充成功', async () => {
 const {command}=await fakeCli('claude');const root=await mkdtemp(path.join(os.tmpdir(),'claude-structured-'));roots.push(root);
 const adapter=new ClaudeAdapter(command,false);
 const invoke=(prompt:string)=>adapter.run({taskId:'structured',root,prompt,readOnly:true,pureText:true,outputPath:path.join(root,'out'),emit:()=>{}}).completed;
 expect(await invoke('FAKE_STRUCTURED_OUTPUT')).toMatchObject({finalMessage:'{"checked":true}',exitCode:0});
 expect(await invoke('FAKE_RESULT_ERROR')).toMatchObject({exitCode:1});
});

it('Claude 已返回推理进度时不再误报启动超时，推理强度传入CLI', async()=>{
 const {command,logPath}=await fakeCli('claude');const root=await mkdtemp(path.join(os.tmpdir(),'claude-thinking-'));roots.push(root);
 const result=await new ClaudeAdapter(command,false).run({taskId:'thinking',root,prompt:'FAKE_THINKING',reasoningEffort:'high',startupTimeoutMs:1000,readOnly:true,outputPath:path.join(root,'out'),emit:()=>{}}).completed;
 expect(result.exitCode).toBe(0);expect(result.finalMessage).toBe('finished');expect((await calls(logPath)).some(c=>c.args.includes('--effort')&&c.args.includes('high'))).toBe(true);
});
