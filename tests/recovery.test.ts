import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/shared/constants.js';
import { RecoveryStore } from '../electron/main/recovery.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe('仓库外恢复快照', () => {
  it('相同内容去重，恢复时不改写正式文件', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-recovery-'));
    roots.push(root);
    const store = new RecoveryStore(root, async () => DEFAULT_SETTINGS);
    await store.create('repo-1', 'manuscript/第一章.md', '未保存正文', 'periodic');
    await store.create('repo-1', 'manuscript/第一章.md', '未保存正文', 'periodic');
    const entries = await store.list('repo-1');
    expect(entries).toHaveLength(1);
    expect((await store.restore('repo-1', entries[0].id)).content).toBe('未保存正文');
  });
});
