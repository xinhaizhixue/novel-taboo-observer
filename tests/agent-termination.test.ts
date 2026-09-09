import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { AgentHub } from '../electron/main/agents/hub.js';
import { ProjectService } from '../electron/main/project.js';
import { AuthorProfileStore } from '../electron/main/profile.js';
import type { AgentAdapter, AdapterRunResult } from '../electron/main/agents/adapter.js';

it.skipIf(process.platform === 'win32')('不响应 SIGTERM 的真实 CLI 及子进程被终止，重复取消保持 cancelled', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'xuzhou-stubborn-'));
  let child: ReturnType<typeof spawn> | undefined;
  let descendant = 0;
  let ready: Promise<unknown> = Promise.resolve();
  try {
    const project = new ProjectService('stubborn');
    await project.create({ root: path.join(root, 'novel'), title: '终止测试', kind: 'novel' });
    const adapter: AgentAdapter = {
      id: 'codex', info: async () => ({ available: true, name: 'Stubborn test CLI', capabilities: {} } as never),
      run: () => {
        child = spawn(process.execPath, ['-e', `process.on('SIGTERM',()=>{});const c=require('child_process').spawn(process.execPath,['-e','process.on("SIGTERM",()=>{});console.log("ready");setInterval(()=>{},1000)'],{stdio:['ignore','pipe','pipe']});c.stdout.once('data',()=>console.log(c.pid));setInterval(()=>{},1000);`], { detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
        ready = once(child.stdout!, 'data').then(([data]) => { descendant = Number(String(data).trim()); });
        const completed: AdapterRunResult['completed'] = new Promise((resolve, reject) => {
          child!.once('error', reject);
          child!.once('close', (code) => resolve({ finalMessage: '', exitCode: code ?? 137, raw: [] }));
        });
        return { process: child as AdapterRunResult['process'], completed };
      }
    };
    const hub = new AgentHub(path.join(root, 'data'), project, new AuthorProfileStore(path.join(root, 'data')), [adapter]);
    const task = await hub.runTask({ adapterId: 'codex', role: 'writer', objective: '等待取消', scope: ['manuscript'], completionCriteria: [] });
    await ready;
    await Promise.all([hub.cancel(task.id), hub.cancel(task.id)]);
    expect((await hub.record(task.id))?.state).toBe('cancelled');
    expect(hub.hasActiveTasks).toBe(false);
    expect(child!.signalCode).toBe('SIGKILL');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(() => process.kill(descendant, 0)).toThrow();
  } finally {
    if (child?.pid) try { process.kill(-child.pid, 'SIGKILL'); } catch {}
    await rm(root, { recursive: true, force: true });
  }
}, 15_000);
