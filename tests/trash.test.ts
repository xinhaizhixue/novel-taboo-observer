import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ProjectService } from '../electron/main/project.js';
import { ProjectTrashStore } from '../electron/main/trash.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe('作者内容可恢复删除', () => {
  it('删除章节前给出影响，移到仓库外回收站并可恢复原位置', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-trash-repo-'));
    const appData = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-trash-data-'));
    roots.push(root, appData);
    const project = new ProjectService('trash-session');
    await project.create({ root, title: '可恢复删除测试', kind: 'novel', idea: '测试' });
    await project.moveFile('manuscript/第一章.md', 'manuscript/第一卷/第001章.md');
    const sourcePath = 'manuscript/第一卷/第001章.md';
    const timestamp = new Date().toISOString();
    await project.eventStore.append('fact.upsert', { id: 'fact-linked', category: 'character', subject: '主角', statement: '第一章明确出现。', status: 'author-confirmed', evidence: [{ filePath: sourcePath, quote: '创作灵感' }], updatedAt: timestamp }, 'author');
    await project.eventStore.append('task.upsert', { id: 'task-linked', title: '复核第一章', description: '', level: 'chapter', status: 'next', kind: 'review', assignee: 'author', source: 'author', priority: 'normal', whyNow: '第一章待复核', known: [], missingDecisions: [], aiPreAnalysis: '', authorDecision: '', agentWork: '', completionCriteria: [], links: [sourcePath], dependencies: [], createdAt: timestamp, updatedAt: timestamp }, 'author');
    await project.eventStore.append('comment.created', { id: 'comment-linked', issueType: '测试', severity: 'warning', summary: '测试评论', evidence: '测试', suggestedAction: '复核', anchor: { filePath: sourcePath, start: 0, end: 1, quote: '#', prefix: '', suffix: '', snapshotId: 'snapshot', snapshotHash: 'hash' }, status: 'open', reviewCount: 0, messages: [], createdAt: timestamp, updatedAt: timestamp }, 'observer');
    const trash = new ProjectTrashStore(appData, project);
    const impact = await trash.analyze('chapter', sourcePath);
    expect(impact).toMatchObject({ files: ['manuscript/第一卷/第001章.md'], title: '第001章' });
    await expect(trash.trash('chapter', impact.path, '错误确认')).rejects.toThrow('请输入');
    const result = await trash.trash('chapter', impact.path, impact.title);
    expect(result.entry.trashPath.startsWith(root)).toBe(false);
    await expect(project.readFile(impact.path)).rejects.toThrow();
    expect(await trash.list()).toHaveLength(1);
    const afterTrash = await project.state();
    expect(afterTrash.facts.find((fact) => fact.id === 'fact-linked')?.status).toBe('conflict');
    expect(afterTrash.tasks.find((task) => task.id === 'task-linked')?.status).toBe('blocked');
    expect(afterTrash.comments.find((comment) => comment.id === 'comment-linked')?.status).toBe('stale');
    const restored = await trash.restore(result.entry.id);
    expect(restored.files.some((file) => file.path === impact.path)).toBe(true);
    expect((await project.readFile(impact.path)).content).toContain('创作灵感');
    expect(restored.facts.find((fact) => fact.id === 'fact-linked')?.status).toBe('author-confirmed');
    expect(restored.tasks.find((task) => task.id === 'task-linked')?.status).toBe('next');
    expect(restored.comments.find((comment) => comment.id === 'comment-linked')?.status).toBe('open');
  });

  it('分卷删除一次覆盖卷内全部章节，但不允许把正文根目录当成分卷', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-trash-volume-'));
    const appData = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-trash-volume-data-'));
    roots.push(root, appData);
    const project = new ProjectService('trash-volume-session');
    await project.create({ root, title: '分卷测试', kind: 'novel' });
    await project.moveFile('manuscript/第一章.md', 'manuscript/第一卷/第001章.md');
    await project.writeFile('manuscript/第一卷/第002章.md', '# 第002章\n\n第二章正文', undefined, true);
    const trash = new ProjectTrashStore(appData, project);
    await expect(trash.analyze('volume', 'manuscript')).rejects.toThrow('正文根目录');
    const impact = await trash.analyze('volume', 'manuscript/第一卷');
    expect(impact.files).toHaveLength(2);
    const result = await trash.trash('volume', impact.path, impact.title);
    expect(result.state.files.filter((file) => file.category === 'manuscript')).toHaveLength(0);
    const restored = await trash.restore(result.entry.id);
    expect(restored.files.filter((file) => file.category === 'manuscript')).toHaveLength(2);
  });

  it('大纲、研究、人物与世界和决定文件都使用同一个影响预览与可恢复回收站', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-trash-all-content-'));
    const appData = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-trash-all-content-data-'));
    roots.push(root, appData);
    const project = new ProjectService('trash-all-content-session');
    await project.create({ root, title: '全部内容删除测试', kind: 'novel' });
    const targets = [
      ['planning/第二卷章纲.md', 'planning'],
      ['research/服饰考据.md', 'research'],
      ['canon/人物档案.md', 'canon'],
      ['decisions/主角不杀人.md', 'decision']
    ] as const;
    for (const [filePath] of targets) await project.writeFile(filePath, `# ${path.basename(filePath, '.md')}\n\n可恢复内容`, undefined, true);
    const trash = new ProjectTrashStore(appData, project);
    for (const [filePath, category] of targets) {
      const impact = await trash.analyze('file', filePath);
      expect(impact).toMatchObject({ category, files: [filePath], linkedAgents: 0 });
      const result = await trash.trash('file', filePath, impact.title);
      expect(result.entry.category).toBe(category);
      await expect(project.readFile(filePath)).rejects.toThrow();
      await trash.restore(result.entry.id);
      expect((await project.readFile(filePath)).content).toContain('可恢复内容');
    }
  });

  it('所有内容区的嵌套目录可整体删除恢复，但区域根目录受保护', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-trash-content-folder-'));
    const appData = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-trash-content-folder-data-'));
    roots.push(root, appData);
    const project = new ProjectService('trash-content-folder-session');
    await project.create({ root, title: '资料目录测试', kind: 'novel' });
    const directories = [
      ['planning/第二卷', 'planning'],
      ['research/城市交通', 'research'],
      ['canon/北塔人物', 'canon'],
      ['decisions/第一卷决定', 'decision']
    ] as const;
    for (const [directory] of directories) {
      await project.writeFile(`${directory}/一.md`, '# 一', undefined, true);
      await project.writeFile(`${directory}/二.md`, '# 二', undefined, true);
    }
    const trash = new ProjectTrashStore(appData, project);
    for (const rootDirectory of ['planning', 'research', 'canon', 'decisions']) await expect(trash.analyze('directory', rootDirectory)).rejects.toThrow('根目录不能删除');
    for (const [directory, category] of directories) {
      const impact = await trash.analyze('directory', directory);
      expect(impact).toMatchObject({ category, title: path.basename(directory) });
      expect(impact.files).toHaveLength(2);
      const result = await trash.trash('directory', impact.path, impact.title);
      expect((await project.files()).some((file) => file.path.startsWith(`${directory}/`))).toBe(false);
      await trash.restore(result.entry.id);
      expect((await project.files()).filter((file) => file.path.startsWith(`${directory}/`))).toHaveLength(2);
    }
  });

  it('系列作品可整部解除关联并恢复，最后一部作品受保护', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-trash-series-work-'));
    const appData = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-trash-series-work-data-'));
    roots.push(root, appData);
    const project = new ProjectService('trash-series-work-session');
    await project.create({ root, title: '雾城系列', kind: 'series' });
    const withSecond = await project.addWork('第二部 · 雨港');
    const second = withSecond.manifest.works.find((work) => work.title.includes('雨港'))!;
    const trash = new ProjectTrashStore(appData, project);
    const impact = await trash.analyze('work', second.manuscriptRoot);
    expect(impact).toMatchObject({ kind: 'work', title: second.title, category: 'manuscript' });
    const result = await trash.trash('work', impact.path, impact.title);
    expect(result.state.manifest.works.map((work) => work.id)).not.toContain(second.id);
    expect(result.entry.work?.item.id).toBe(second.id);
    const restored = await trash.restore(result.entry.id);
    expect(restored.manifest.works.map((work) => work.id)).toContain(second.id);
    expect(restored.manifest.activeWorkId).toBe(second.id);
    const first = restored.manifest.works.find((work) => work.id !== second.id)!;
    await trash.trash('work', second.manuscriptRoot, second.title);
    await expect(trash.analyze('work', first.manuscriptRoot)).rejects.toThrow('至少保留一部作品');
  });
});
