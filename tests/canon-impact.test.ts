import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeCanonImpact } from '../electron/main/canon-impact.js';
import { ProjectService } from '../electron/main/project.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe('正典变更影响分析', () => {
  it('在确认修改前列出依赖旧事实的正文、计划、事实和任务', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-canon-impact-'));
    roots.push(root);
    const project = new ProjectService('canon-impact');
    await project.create({ root, title: '雾城伤情', kind: 'novel' });
    await project.writeFile('manuscript/第一章.md', '# 第一章\n\n林遥的左手骨折，三天内不能持刀。\n');
    await project.writeFile('manuscript/第二章.md', '# 第二章\n\n林遥改用右手完成训练。\n', undefined, true);
    await project.writeFile('planning/近期章纲.md', '# 近期章纲\n\n林遥左手骨折期间改走调查线。\n');
    await project.eventStore.append('fact.upsert', { id: 'fact-injury', category: 'character', subject: '林遥的伤势', statement: '左手骨折，三天内不能持刀。', status: 'author-confirmed', evidence: [{ filePath: 'manuscript/第一章.md', quote: '林遥的左手骨折，三天内不能持刀。' }], updatedAt: new Date().toISOString() }, 'author');
    await project.eventStore.append('fact.upsert', { id: 'fact-training', category: 'timeline', subject: '林遥训练', statement: '受左手骨折影响改用右手。', status: 'text-explicit', evidence: [{ filePath: 'manuscript/第二章.md', quote: '改用右手' }], updatedAt: new Date().toISOString() }, 'system');
    await project.eventStore.append('task.upsert', { id: 'task-recovery', title: '处理林遥左手骨折后的行动', description: '保持伤势连续', level: 'chapter', status: 'next', kind: 'revision', assignee: 'author', source: 'author', priority: 'normal', whyNow: '', known: ['左手骨折'], missingDecisions: [], aiPreAnalysis: '', authorDecision: '', agentWork: '', completionCriteria: [], links: ['manuscript/第二章.md'], dependencies: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, 'author');

    const impact = await analyzeCanonImpact(project, { factId: 'fact-injury', category: 'character', subject: '林遥的伤势', statement: '左手只是轻微扭伤，当天可以持刀。' });
    expect(impact.affectedChapters.map((item) => item.filePath)).toEqual(expect.arrayContaining(['manuscript/第一章.md', 'manuscript/第二章.md']));
    expect(impact.affectedPlans.map((item) => item.filePath)).toContain('planning/近期章纲.md');
    expect(impact.relatedFactIds).toContain('fact-training');
    expect(impact.relatedTaskIds).toContain('task-recovery');
    expect(impact.warnings.join('')).toContain('作者已确认事实');
  });

  it('事实使用废弃与恢复状态保留审计历史，而不是物理删除事件', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-canon-deprecate-'));
    roots.push(root);
    const project = new ProjectService('canon-deprecate');
    await project.create({ root, title: '正典状态测试', kind: 'novel' });
    const base = { id: 'fact-status', category: 'world-rule' as const, subject: '雨夜来信', statement: '只在雨夜出现。', evidence: [], updatedAt: new Date().toISOString() };
    await project.eventStore.append('fact.upsert', { ...base, status: 'author-confirmed' }, 'author');
    await project.eventStore.append('fact.upsert', { ...base, status: 'deprecated', updatedAt: new Date().toISOString() }, 'author');
    expect((await project.state()).facts.find((fact) => fact.id === base.id)?.status).toBe('deprecated');
    await project.eventStore.append('fact.upsert', { ...base, status: 'author-confirmed', updatedAt: new Date().toISOString() }, 'author');
    expect((await project.state()).facts.find((fact) => fact.id === base.id)?.status).toBe('author-confirmed');
    expect((await project.eventStore.all()).filter((event) => event.type === 'fact.upsert' && (event.payload as { id?: string }).id === base.id)).toHaveLength(3);
  });
});
