import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { FSWatcher } from 'chokidar';
import { WATCHED_PROJECT_ROOTS, watchProjectFiles } from '../electron/main/watch.js';
import { atomicWrite } from '../electron/main/utils.js';

const roots: string[] = [];
const watchers: FSWatcher[] = [];
afterEach(async () => {
  await Promise.all(watchers.splice(0).map((watcher) => watcher.close()));
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function waitUntil(check: () => boolean, timeout = 10_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('等待项目文件监听事件超时');
}

describe('作品仓库外部文件监听', () => {
  it('在 Chokidar v4 中监听真实目录，而不是已移除支持的 glob 模式', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-watch-'));
    roots.push(root);
    await Promise.all(WATCHED_PROJECT_ROOTS.map((folder) => mkdir(path.join(root, folder), { recursive: true })));
    const volume = path.join(root, 'manuscript', '第一卷');
    await mkdir(volume, { recursive: true });
    const chapter = path.join(volume, '第001章.md');
    await atomicWrite(chapter, '# 第一章\n\n监听前基线。\n');
    const fileChanges: Array<{ path: string; content: string }> = [];
    let projectChanges = 0;
    const watcher = await watchProjectFiles(root, {
      onFile: (change) => fileChanges.push({ path: change.path, content: change.content }),
      onProject: () => { projectChanges += 1; }
    });
    watchers.push(watcher);

    await atomicWrite(chapter, '# 第一章\n\n第一次外部写入。\n');
    await waitUntil(() => fileChanges.some((change) => change.path === 'manuscript/第一卷/第001章.md' && change.content.includes('第一次外部写入')));

    await atomicWrite(chapter, '# 第一章\n\nAgent 第二次写入。\n');
    await waitUntil(() => fileChanges.some((change) => change.content.includes('Agent 第二次写入')));

    await atomicWrite(path.join(volume, '第002章.md'), '# 第二章\n\n新增章节。\n');
    await waitUntil(() => fileChanges.some((change) => change.path === 'manuscript/第一卷/第002章.md' && change.content.includes('新增章节')));

    await atomicWrite(path.join(root, '.novel', 'events', '2026-08', 'session.jsonl'), '{"type":"task.upsert"}\n');
    await waitUntil(() => projectChanges > 0);
    expect(fileChanges.some((change) => change.path === 'manuscript/第一卷/第001章.md')).toBe(true);
  }, 30_000);
});
