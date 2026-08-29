import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthorProfileStore } from '../electron/main/profile.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe('独立作者档案', () => {
  it('候选需显式确认，并可导出后在另一台实例导入', async () => {
    const firstRoot = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-profile-a-'));
    const secondRoot = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-profile-b-'));
    roots.push(firstRoot, secondRoot);
    const first = new AuthorProfileStore(firstRoot);
    let profile = await first.upsert({ category: 'voice', text: '紧张场景减少解释性独白', status: 'candidate', evidence: ['反馈 A', '反馈 B'] });
    expect(profile.rules[0].status).toBe('candidate');
    profile = await first.upsert({ id: profile.rules[0].id, status: 'confirmed' });
    const exported = path.join(firstRoot, 'export.json');
    await first.exportFile(exported);
    const imported = await new AuthorProfileStore(secondRoot).importFile(exported);
    expect(imported.id).toBe(profile.id);
    expect(imported.rules[0]).toMatchObject({ status: 'confirmed', text: '紧张场景减少解释性独白' });
  });

  it('空白本机档案会恢复仓库快照，并支持编辑后删除', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-profile-snapshot-'));
    roots.push(root);
    const store = new AuthorProfileStore(root);
    await store.get();
    const snapshot = JSON.stringify({ schemaVersion: 1, id: 'author-from-repo', name: '仓库作者', updatedAt: '2026-08-24T00:00:00.000Z', rules: [{ id: 'style-repo', category: 'voice', text: '规则通过动作呈现', status: 'confirmed', evidence: ['第一章', '第二章'], createdAt: '2026-08-24T00:00:00.000Z', updatedAt: '2026-08-24T00:00:00.000Z' }] });
    let profile = await store.importSnapshot(snapshot);
    expect(profile.rules).toHaveLength(1);
    profile = await store.upsert({ id: 'style-repo', text: '规则通过动作、代价与选择呈现' });
    expect(profile.rules[0].text).toContain('代价');
    profile = await store.remove('style-repo');
    expect(profile.rules).toHaveLength(0);
  });

  it('记忆整理员复用完全相同规则时保留ID和作者状态，并合并新旧证据', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-profile-dedupe-'));
    roots.push(root);
    const store = new AuthorProfileStore(root);
    let profile = await store.upsert({ category: 'voice', text: '规则通过动作与代价呈现', status: 'confirmed', evidence: ['第一章证据', '第二章证据'] });
    const id = profile.rules[0].id;
    profile = await store.upsert({ category: 'voice', text: '规则通过动作与代价呈现', status: 'candidate', evidence: ['第三章证据', '第二章证据'] });
    expect(profile.rules).toHaveLength(1);
    expect(profile.rules[0]).toMatchObject({ id, status: 'confirmed', evidence: ['第一章证据', '第二章证据', '第三章证据'] });
  });

  it('导入旧快照时只归并类别和文本完全相同且无作者状态冲突的重复项', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-profile-migration-'));
    roots.push(root);
    const store = new AuthorProfileStore(root);
    const shared = { category: 'improvement' as const, text: '关键数字必须可复算', createdAt: '2026-08-20T00:00:00.000Z' };
    const snapshot = JSON.stringify({ schemaVersion: 1, id: 'author-duplicate', name: '仓库作者', updatedAt: '2026-08-29T00:00:00.000Z', rules: [
      { ...shared, id: 'style-confirmed', status: 'confirmed', evidence: ['旧证据'], updatedAt: '2026-08-20T00:00:00.000Z' },
      { ...shared, id: 'style-candidate', status: 'candidate', evidence: ['新证据'], updatedAt: '2026-08-29T00:00:00.000Z' }
    ] });
    const profile = await store.importSnapshot(snapshot);
    expect(profile.rules).toHaveLength(1);
    expect(profile.rules[0]).toMatchObject({ id: 'style-confirmed', status: 'confirmed', evidence: ['旧证据', '新证据'] });
  });
});
