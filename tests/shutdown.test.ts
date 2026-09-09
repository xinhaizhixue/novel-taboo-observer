import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShutdownCoordinator, withDeadline } from '../electron/main/shutdown.js';

afterEach(() => vi.useRealTimers());
describe('退出协调', () => {
  it('连续关闭与 Command-Q 只清理一次，完成之前不销毁窗口', async () => {
    let saved!: () => void;
    const prepare = vi.fn(() => new Promise<void>((resolve) => { saved = resolve; }));
    const finish = vi.fn();
    const report = vi.fn();
    const shutdown = new ShutdownCoordinator(prepare, finish, report);
    const first = shutdown.request();
    expect(shutdown.request()).toBe(first);
    await Promise.resolve();
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(finish).not.toHaveBeenCalled();
    saved();
    await first;
    await shutdown.request();
    expect(finish).toHaveBeenCalledTimes(1);
    expect(report).not.toHaveBeenCalled();
  });
  it('恢复副本失败时保留窗口并允许重试，不产生未处理拒绝', async () => {
    const prepare = vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValueOnce(undefined);
    const finish = vi.fn();
    const report = vi.fn();
    const shutdown = new ShutdownCoordinator(prepare, finish, report);
    await expect(shutdown.request()).resolves.toBeUndefined();
    expect(finish).not.toHaveBeenCalled();
    expect(shutdown.finished).toBe(false);
    expect(report).toHaveBeenCalledTimes(1);
    await shutdown.request();
    expect(finish).toHaveBeenCalledTimes(1);
  });
  it('挂起清理按时返回；迟到的拒绝仍被处理且计时器被清除', async () => {
    vi.useFakeTimers();
    let reject!: (error: Error) => void;
    const hung = new Promise<void>((_resolve, fail) => { reject = fail; });
    const outcome = expect(withDeadline(hung, 100, 'timeout')).rejects.toThrow('timeout');
    await vi.advanceTimersByTimeAsync(100);
    await outcome;
    reject(new Error('late rejection'));
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(0);
  });
});
