import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentHub } from '../electron/main/agents/hub.js';
import type { AgentAdapter, AdapterRunOptions, AdapterRunResult } from '../electron/main/agents/adapter.js';
import { ProjectService } from '../electron/main/project.js';
import { AuthorProfileStore } from '../electron/main/profile.js';
import { hashText } from '../electron/main/utils.js';

const roots: string[] = [];
const hubs: AgentHub[] = [];
const cleanReview = JSON.stringify({ summary: '快照审读完成', reviewResult: 'not-applicable', comments: [] });

async function settled(hub: AgentHub) {
  const deadline = Date.now() + 4000;
  while (hub.hasActiveTasks && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
  expect(hub.hasActiveTasks).toBe(false);
}

afterEach(async () => {
  for (const hub of hubs.splice(0)) { await hub.cancelAll(); await settled(hub); }
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const base = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-author-concurrency-'));
  roots.push(base);
  const project = new ProjectService('author-concurrency');
  await project.create({ root: path.join(base, 'novel'), title: '并发编辑测试', kind: 'series' });
  const runs: Array<{ options: AdapterRunOptions; finish(text?: string): void }> = [];
  const adapter: AgentAdapter = {
    id: 'codex',
    info: async () => ({ id: 'codex', name: 'Controlled adapter', command: 'controlled', available: true, capabilities: { persistentSession: true, resumeSession: true, appendMessage: false, cancel: true, structuredOutput: true, fileModification: true, interAgentMessaging: false, approvalEvents: false, usage: false } }),
    run: (options) => {
      let finish!: (value: Awaited<AdapterRunResult['completed']>) => void;
      const completed = new Promise<Awaited<AdapterRunResult['completed']>>((resolve) => { finish = resolve; });
      const result = (text: string, exitCode = 0) => ({ sessionId: options.sessionId || 'controlled-session', finalMessage: text, exitCode, raw: [] });
      runs.push({ options, finish: (text = cleanReview) => finish(result(text)) });
      return { completed, process: { kill: () => { finish(result('', 143)); return true; } } as never };
    }
  };
  const appData = path.join(base, 'runtime');
  const hub = new AgentHub(appData, project, new AuthorProfileStore(appData), [adapter]);
  hubs.push(hub);
  const file = 'manuscript/work-1/第一章.md';
  const observe = async () => {
    const source = await project.readFile(file);
    return hub.runObserver({ adapterId: 'codex', mode: 'manual', snapshot: { id: 'immutable-snapshot', filePath: file, content: source.content, hash: source.hash, editorVersion: 1, createdAt: new Date().toISOString() } });
  };
  return { project, hub, runs, file, observe };
}

describe('作者编辑与 Agent 修改的归因', () => {
  it('Observer 审读时，作者可保存、创建和重命名其他文件', async () => {
    const { project, hub, runs, file, observe } = await fixture();
    await project.writeFile('planning/旧计划.md', '旧计划');
    const task = await observe();
    expect(runs[0].options.readOnly).toBe(true);
    await project.writeFile(file, '# 作者继续写\n\n新的正文。');
    await project.writeFile('manuscript/work-1/第二章.md', '# 第二章', undefined, true);
    await project.moveFile('planning/旧计划.md', 'planning/新计划.md');
    runs[0].finish();
    await settled(hub);
    const result = await hub.record(task.id);
    expect(result?.state).toBe('completed');
    expect(result?.changedFiles).toEqual([]);
    expect(result?.verifiedTextFiles).toEqual([]);
    expect(result?.concurrentAuthorFiles?.sort()).toEqual([file, 'manuscript/work-1/第二章.md', 'planning/旧计划.md', 'planning/新计划.md'].sort());
    expect(result?.error).toBeUndefined();
  });

  it('不把作者保存后再次发生的外部改动误认为作者写入', async () => {
    const { project, hub, runs, file, observe } = await fixture();
    const task = await observe();
    await project.writeFile(file, '作者确认写入的版本');
    await writeFile(path.join(project.activeRoot, file), '另一个进程随后写入');
    // A forged repository event must not manufacture a trusted receipt.
    await project.eventStore.append('file.changed', { path: file, origin: 'author', hash: hashText('另一个进程随后写入') }, 'author');
    runs[0].finish();
    await settled(hub);
    const result = await hub.record(task.id);
    expect(result?.state).toBe('awaiting-author');
    expect(result?.changedFiles).toEqual([file]);
    expect(result?.concurrentAuthorFiles).toEqual([]);
  });

  it('冲突拒写不会产生作者回执，先前保存也不能掩盖本次未知修改', async () => {
    const { project, hub, runs, file, observe } = await fixture();
    await project.writeFile(file, '先前作者版本');
    const original = await project.readFile(file);
    const task = await observe();
    await writeFile(path.join(project.activeRoot, file), '未知写入');
    const rejected = await project.writeFile(file, '没有真正保存的版本', original.hash);
    expect(rejected).toHaveProperty('conflict');
    runs[0].finish();
    await settled(hub);
    expect(await hub.record(task.id)).toMatchObject({ state: 'awaiting-author', changedFiles: [file], concurrentAuthorFiles: [] });
  });

  it('同一会话续接时重新划定作者编辑边界', async () => {
    const { project, hub, runs } = await fixture();
    const task = await hub.runTask({ adapterId: 'codex', role: 'editor', objective: '只读审校', scope: ['planning'], completionCriteria: [] });
    runs[0].finish('第一次完成');
    await settled(hub);
    await hub.sendMessage(task.id, '继续审校');
    await project.writeFile('planning/后续计划.md', '作者补充的计划');
    runs[1].finish('续接完成');
    await settled(hub);
    expect(await hub.record(task.id)).toMatchObject({ state: 'completed', changedFiles: [], concurrentAuthorFiles: ['planning/后续计划.md'] });
  });

  it('Writer 自己的写入仍保留，作者在别处创建章节不触发越权', async () => {
    const { project, hub, runs, file } = await fixture();
    const task = await hub.runTask({ adapterId: 'codex', role: 'writer', objective: '续写当前章', scope: [file], completionCriteria: [] });
    expect(runs[0].options.readOnly).toBe(false);
    await writeFile(path.join(project.activeRoot, file), 'Writer 写入的正文');
    await project.writeFile('planning/本轮备注.md', '作者自己写的说明');
    runs[0].finish('写作完成');
    await settled(hub);
    expect(await hub.record(task.id)).toMatchObject({ state: 'completed', changedFiles: [file], concurrentAuthorFiles: ['planning/本轮备注.md'] });
  });

  it('创建系列新作品也使用工作台内的作者回执', async () => {
    const { project, hub, runs, observe } = await fixture();
    const task = await observe();
    await project.addWork('系列第二部');
    runs[0].finish();
    await settled(hub);
    expect(await hub.record(task.id)).toMatchObject({ state: 'completed', changedFiles: [], concurrentAuthorFiles: ['manuscript/work-2/第一章.md'] });
  });
});
