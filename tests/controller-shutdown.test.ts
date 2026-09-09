import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const handlers = vi.hoisted(() => new Map<string, (...args: any[]) => any>());
vi.mock('electron', () => ({ BrowserWindow: { getAllWindows: () => [] }, ipcMain: { handle: (name: string, fn: (...args: any[]) => any) => handlers.set(name, fn) }, clipboard: {}, dialog: {}, shell: {} }));
import { WorkbenchController } from '../electron/main/controller.js';
const roots: string[] = [];
afterEach(async () => { handlers.clear(); await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'xuzhou-close-')); roots.push(root);
  const controller = new WorkbenchController(path.join(root, 'data'));
  const project = await controller.project.create({ root: path.join(root, 'novel'), title: '退出测试', kind: 'novel' });
  controller.register();
  await handlers.get('workbench:updateBufferState')!({}, { path: 'manuscript/未保存.md', content: '尚未保存的最后一句', dirty: true, hash: 'missing' });
  return { controller, project };
}
describe('关闭时保护正文与释放资源', () => {
  it('停止 Agent 之前写恢复副本；Agent 失败仍关闭监听', async () => {
    const { controller, project } = await fixture();
    const cancel = vi.spyOn(controller.hub, 'cancelAll').mockImplementation(async () => {
      const entries = await controller.recovery.list(project.manifest.projectId);
      expect(entries).toHaveLength(1);
      expect((await controller.recovery.restore(project.manifest.projectId, entries[0].id)).content).toBe('尚未保存的最后一句');
      throw new Error('stuck agent');
    });
    const force = vi.spyOn(controller.hub, 'forceStopAll').mockImplementation(() => {});
    const close = vi.fn().mockResolvedValue(undefined);
    Object.assign(controller, { watcher: { close } });
    await controller.prepareToClose();
    expect(cancel).toHaveBeenCalledTimes(1); expect(force).toHaveBeenCalledTimes(1); expect(close).toHaveBeenCalledTimes(1);
  });
  it('副本失败不停止 Agent；仍接受保存并可重试关闭', async () => {
    const { controller } = await fixture();
    const create = vi.spyOn(controller.recovery, 'create').mockRejectedValueOnce(new Error('disk full'));
    const cancel = vi.spyOn(controller.hub, 'cancelAll').mockResolvedValue(undefined);
    await expect(controller.prepareToClose()).rejects.toThrow('disk full');
    expect(cancel).not.toHaveBeenCalled();
    await expect(handlers.get('workbench:updateBufferState')!({}, { path: 'manuscript/未保存.md', dirty: false, hash: 'saved' })).resolves.toBeUndefined();
    await controller.prepareToClose();
    expect(create).toHaveBeenCalledTimes(1); expect(cancel).toHaveBeenCalledTimes(1);
  });
});

describe('Writer 完成后的后台审阅', () => {
  it('按 Writer 实际改动文件发起，和当前编辑器及 Observer 开关无关', async () => {
    const { controller } = await fixture();
    await controller.project.writeFile('manuscript/第2章.md', '# 第2章\n新的动作。');
    const review = vi.spyOn(controller.hub, 'runObserver').mockResolvedValue({ id: 'auto-review' } as never);
    vi.spyOn(controller.hub, 'waitForTask').mockResolvedValue(undefined);
    controller.hub.onWriterCompleted?.({ id: 'writer-completed', role: 'writer', adapterId: 'codex', state: 'completed', changedFiles: ['manuscript/第2章.md'] } as never);
    await vi.waitFor(() => expect(review).toHaveBeenCalledTimes(1));
    expect(review.mock.calls[0][0].snapshot.filePath).toBe('manuscript/第2章.md');
    expect(review.mock.calls[0][0].snapshot.content).toContain('新的动作');
    expect(review.mock.calls[0][0].sourceWriterTaskId).toBe('writer-completed');
    expect(review.mock.calls[0][0].snapshot.content).not.toContain('尚未保存的最后一句');
  });
  it('关闭自动审阅设置后不会启动额外 Agent', async () => {
    const { controller } = await fixture();
    const settings = await controller.settings.get();
    await controller.settings.update({ review: { ...settings.review, afterWriter: false } });
    const review = vi.spyOn(controller.hub, 'runObserver');
    controller.hub.onWriterCompleted?.({ id: 'writer-disabled', role: 'writer', adapterId: 'codex', state: 'completed', changedFiles: ['manuscript/第一章.md'] } as never);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(review).not.toHaveBeenCalled();
  });
});

it('Writer 完成后的自动审阅等待已有审阅结束，不因范围重叠丢掉任务', async () => {
  const { controller } = await fixture();
  await controller.project.writeFile('manuscript/第2章.md', '第二章');
  let release!: () => void;
  const waiting = vi.spyOn(controller.hub, 'waitForReviews').mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));
  const review = vi.spyOn(controller.hub, 'runObserver').mockResolvedValue({ id: 'queued-review' } as never);
  vi.spyOn(controller.hub, 'waitForTask').mockResolvedValue(undefined);
  controller.hub.onWriterCompleted?.({ id: 'writer', role: 'writer', state: 'completed', adapterId: 'codex', changedFiles: ['manuscript/第2章.md'] } as never);
  await vi.waitFor(() => expect(waiting).toHaveBeenCalled());
  expect(review).not.toHaveBeenCalled();
  release();
  await vi.waitFor(() => expect(review).toHaveBeenCalledTimes(1));
});
