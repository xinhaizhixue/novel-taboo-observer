import { appendFile, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ProjectService } from '../electron/main/project.js';
import { exec } from '../electron/main/utils.js';
import type { AuthorProfile } from '../src/shared/types.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-project-'));
  roots.push(root);
  const project = new ProjectService('test-session');
  const state = await project.create({ root, title: '雾城来信', kind: 'novel', idea: '死者会在雨夜寄回一封信。' });
  return { root, project, state };
}

describe('可迁移作品仓库', () => {
  it('把正文、正典、规划、目标和任务写入 Git 仓库', async () => {
    const { root, state } = await fixture();
    expect(state.manifest.title).toBe('雾城来信');
    expect(state.continueCard.next.length).toBeGreaterThan(0);
    expect(state.manuscriptStats).toMatchObject({ targetCharacters: 1_000_000, chapterCount: 1 });
    expect(state.manuscriptStats.totalCharacters).toBeGreaterThan(0);
    expect(await readFile(path.join(root, 'manuscript', '第一章.md'), 'utf8')).toContain('创作灵感');
    expect(await readFile(path.join(root, 'research', 'README.md'), 'utf8')).toContain('不会自动升级为作品正典');
    const events = await readFile(path.join(root, '.novel', 'events', new Date().toISOString().slice(0, 7), 'session-test-session.jsonl'), 'utf8');
    expect(events).toContain('goal.upsert');
    expect(events).toContain('task.upsert');
  });

  it('保存计划篇幅并汇总跨章节正文进度', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-target-'));
    roots.push(root);
    const project = new ProjectService('target-session');
    await project.create({ root, title: '百万字测试', kind: 'novel', targetCharacters: 1_100_000 });
    await project.writeFile('manuscript/第二章.md', '# 第二章\n\n一二三四五', undefined, true);
    const state = await project.state();
    expect(state.manifest.targetCharacters).toBe(1_100_000);
    expect(state.manuscriptStats.chapterCount).toBe(2);
    expect(state.manuscriptStats.totalCharacters).toBeGreaterThanOrEqual(10);
  });

  it('换一个本机实例后可从 manifest 与事件重建关键状态', async () => {
    const { root, state } = await fixture();
    const otherComputer = new ProjectService('other-session');
    const restored = await otherComputer.open(root);
    expect(restored.manifest.projectId).toBe(state.manifest.projectId);
    expect(restored.tasks.map((item) => item.title)).toContain('完成开书最小准备');
    expect(restored.continueCard.lastFile).toBe('manuscript/第一章.md');
  });

  it('作者档案候选与证据随仓库迁移，但状态仍明确区分是否生效', async () => {
    const { root, project } = await fixture();
    const timestamp = new Date().toISOString();
    const profile: AuthorProfile = {
      schemaVersion: 1,
      id: 'author-portable-style',
      name: '迁移测试作者',
      updatedAt: timestamp,
      rules: [
        { id: 'confirmed-rule', category: 'voice', text: '已确认声音', status: 'confirmed', evidence: ['作者决定'], createdAt: timestamp, updatedAt: timestamp },
        { id: 'candidate-rule', category: 'improvement', text: '待确认候选', status: 'candidate', evidence: ['第一条正文证据', '第二条反馈证据'], createdAt: timestamp, updatedAt: timestamp }
      ]
    };
    await project.linkAuthorProfile(profile);
    const manifest = JSON.parse(await readFile(path.join(root, '.novel', 'manifest.json'), 'utf8')) as { authorProfile: { snapshot: string } };
    const snapshot = JSON.parse(manifest.authorProfile.snapshot) as AuthorProfile;
    expect(snapshot.rules.map((rule) => rule.status)).toEqual(['confirmed', 'candidate']);
    expect(snapshot.rules.find((rule) => rule.status === 'candidate')?.evidence).toHaveLength(2);
  });

  it('从“打开其他仓库”接管空Git仓库时也建立可写第一章和最小引导', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-open-empty-'));
    roots.push(root);
    await exec('git', ['init'], root);
    const state = await new ProjectService('open-empty-session').open(root);
    expect(state.files.map((file) => file.path)).toEqual(expect.arrayContaining(['manuscript/第一章.md', 'planning/滚动规划.md', 'canon/故事正典.md']));
    expect(state.continueCard.next.length).toBeGreaterThan(0);
    expect(await readFile(path.join(root, 'manuscript', '第一章.md'), 'utf8')).toContain('# 第一章');
  });

  it('事件行损坏时保留有效历史并显示可恢复诊断', async () => {
    const { root, state } = await fixture();
    const eventFile = path.join(root, '.novel', 'events', new Date().toISOString().slice(0, 7), 'session-test-session.jsonl');
    await appendFile(eventFile, '{损坏的事件行\n', 'utf8');
    const restored = await new ProjectService('diagnostic-session').open(root);
    expect(restored.tasks.map((item) => item.title)).toContain(state.tasks[0].title);
    expect(restored.dataWarnings[0]).toContain('已保留原文件并跳过该行');
  });

  it('不静默改写不兼容的数据版本', async () => {
    const { root } = await fixture();
    const manifestPath = path.join(root, '.novel', 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { schemaVersion: number };
    await writeFile(manifestPath, JSON.stringify({ ...manifest, schemaVersion: 0 }), 'utf8');
    await expect(new ProjectService('old-version').open(root)).rejects.toThrow('先备份仓库');
    await writeFile(manifestPath, JSON.stringify({ ...manifest, schemaVersion: 999 }), 'utf8');
    await expect(new ProjectService('future-version').open(root)).rejects.toThrow('请升级工作台');
  });

  it('期望哈希不一致时返回冲突并保留磁盘内容', async () => {
    const { project } = await fixture();
    const file = await project.readFile('manuscript/第一章.md');
    await project.writeFile(file.path, `${file.content}外部修改`, file.hash);
    const conflicted = await project.writeFile(file.path, `${file.content}作者未保存修改`, file.hash);
    expect('conflict' in conflicted).toBe(true);
    expect((await project.readFile(file.path)).content).toContain('外部修改');
  });

  it('新建文件绝不覆盖同名正文，并能全文搜索', async () => {
    const { project } = await fixture();
    await expect(project.writeFile('manuscript/第一章.md', '不应覆盖', undefined, true)).rejects.toThrow('已经存在');
    const results = await project.search('死者会在雨夜');
    expect(results[0]).toMatchObject({ path: 'manuscript/第一章.md', line: 3 });
    expect((await project.readFile('manuscript/第一章.md')).content).not.toBe('不应覆盖');
  });

  it('为可读Diff提供HEAD与工作区两个真实版本，并暴露仓库信息', async () => {
    const { root, project } = await fixture();
    await exec('git', ['add', '.'], root);
    await exec('git', ['-c', 'user.name=Novel Test', '-c', 'user.email=novel@test.invalid', 'commit', '-m', '初始版本'], root);
    const before = await project.readFile('manuscript/第一章.md');
    await project.writeFile(before.path, `${before.content}\n作者修改`, before.hash);
    const versions = await project.gitService.versions(before.path);
    expect(versions).toMatchObject({ oldExists: true, newExists: true, binary: false });
    expect(versions.oldContent).not.toContain('作者修改');
    expect(versions.newContent).toContain('作者修改');
    const info = await project.gitService.info();
    expect(info).toMatchObject({ root, clean: false, changedFiles: 1 });
    expect(info.branch).toBeTruthy();
  });

  it('搜索章节号时优先返回文件名命中的章节，而不是前文里的预告', async () => {
    const { project } = await fixture();
    await project.writeFile('manuscript/第531章-预告.md', '# 第531章\n\n下一章进入第532章。', undefined, true);
    await project.writeFile('manuscript/第532章-目标.md', '# 第532章 目标\n\n正文。', undefined, true);
    const results = await project.search('532');
    expect(results[0]).toMatchObject({ path: 'manuscript/第532章-目标.md', line: 1 });
    expect(results.some((result) => result.path === 'manuscript/第531章-预告.md')).toBe(true);
  });

  it('安全移动章节且不覆盖已有文件', async () => {
    const { project } = await fixture();
    const before = await project.readFile('manuscript/第一章.md');
    await project.moveFile('manuscript/第一章.md', 'manuscript/第一卷/第001章.md');
    expect((await project.readFile('manuscript/第一卷/第001章.md')).content).toBe(before.content);
    await project.writeFile('manuscript/目标已存在.md', '已有内容', undefined, true);
    await expect(project.moveFile('manuscript/第一卷/第001章.md', 'manuscript/目标已存在.md')).rejects.toThrow('已经存在');
    expect((await project.readFile('manuscript/目标已存在.md')).content).toBe('已有内容');
  });

  it('以作者看得懂的分卷和章号顺序返回目录', async () => {
    const { project } = await fixture();
    await project.moveFile('manuscript/第一章.md', 'manuscript/第一卷/第001章.md');
    await project.writeFile('manuscript/第十卷/第901章.md', '# 第901章', undefined, true);
    await project.writeFile('manuscript/第七卷/第469章.md', '# 第469章', undefined, true);
    await project.writeFile('manuscript/第二卷/第071章.md', '# 第071章', undefined, true);
    expect((await project.files()).filter((file) => file.category === 'manuscript').map((file) => file.path)).toEqual([
      'manuscript/第一卷/第001章.md',
      'manuscript/第二卷/第071章.md',
      'manuscript/第七卷/第469章.md',
      'manuscript/第十卷/第901章.md'
    ]);
  });

  it('系列作品使用独立正文目录并可切换当前作品', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-series-'));
    roots.push(root);
    const project = new ProjectService('series-session');
    let state = await project.create({ root, title: '雾城系列', kind: 'series', idea: '每本书追查同一场旧案。' });
    expect(state.continueCard.lastFile).toBe('manuscript/work-1/第一章.md');
    state = await project.addWork('第二部');
    expect(state.manifest.works).toHaveLength(2);
    expect(state.continueCard.lastFile).toBe('manuscript/work-2/第一章.md');
    state = await project.activateWork('work-1');
    expect(state.manifest.activeWorkId).toBe('work-1');
    expect(state.continueCard.lastFile).toBe('manuscript/work-1/第一章.md');
  });

  it('位于另一个 Git 仓库下时仍初始化为独立小说仓库', async () => {
    const outer = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-outer-git-'));
    roots.push(outer);
    await exec('git', ['init'], outer);
    const inner = path.join(outer, 'novels', '独立作品');
    const project = new ProjectService('nested-session');
    await project.create({ root: inner, title: '独立作品', kind: 'novel' });
    expect(await realpath((await exec('git', ['rev-parse', '--show-toplevel'], inner)).stdout.trim())).toBe(await realpath(inner));
  });
});
