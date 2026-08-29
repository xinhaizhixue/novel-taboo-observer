import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { atomicWrite } from '../electron/main/utils.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe('并发安全原子写入', () => {
  it('同一毫秒并发写同一状态文件时临时文件不重名', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-atomic-'));
    roots.push(root);
    const target = path.join(root, 'runtime.json');
    const values = Array.from({ length: 24 }, (_, index) => JSON.stringify({ index }));
    await Promise.all(values.map((value) => atomicWrite(target, value)));
    expect(values).toContain(await readFile(target, 'utf8'));
    expect((await readdir(root)).filter((file) => file.endsWith('.tmp'))).toEqual([]);
  });
});
