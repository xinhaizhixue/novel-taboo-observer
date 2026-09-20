import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ProjectService } from '../electron/main/project.js';
import { ContextAssembler } from '../electron/main/context.js';
import type { ObserverComment } from '../src/shared/types.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe('任务上下文中的研究资料', () => {
  it('优先纳入任务点名的章节范围和当前计划，不被旧规划与长工作台历史挤掉', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-context-explicit-range-'));
    roots.push(root);
    const project = new ProjectService('context-explicit-range');
    await project.create({ root, title: '续写资料选择', kind: 'novel' });
    await project.writeFile('planning/滚动规划.md', '历史快照。\n' + '人物计划和当前情节。'.repeat(400));
    await project.writeFile('planning/current-plan.md', '这里是目前有效的计划，旧规划仅供追溯。');
    for (let chapter = 23; chapter <= 26; chapter += 1) {
      await project.writeFile(`manuscript/第${chapter}章.md`, chapter === 26 ? '# 第26章' : `# 第${chapter}章\n${'相邻场景人物行动。'.repeat(330)}`);
    }
    const timestamp = '2026-09-20T00:00:00.000Z';
    const comment: ObserverComment = {
      id: 'large-open-comment', issueType: '衔接', severity: 'suggestion', summary: '尚待处理的历史问题。'.repeat(1700), evidence: '正文', suggestedAction: '结合具体场景判断', status: 'open', reviewCount: 0,
      anchor: { filePath: 'manuscript/第一章.md', start: 0, end: 1, quote: '#', prefix: '', suffix: '', snapshotId: 'snapshot', snapshotHash: 'hash' },
      messages: [], createdAt: timestamp, updatedAt: timestamp
    };
    await project.eventStore.append('comment.created', comment as never, 'observer');
    const pack = await new ContextAssembler(project).build({ task: '续写第26章，先阅读第23—25章和 planning/current-plan.md。', filePath: 'manuscript/第26章.md', content: '# 第26章', budget: 28_000 });
    for (const source of ['manuscript/第23章.md', 'manuscript/第24章.md', 'manuscript/第25章.md', 'planning/current-plan.md']) {
      expect(pack.items.find((item) => item.source === source)).toMatchObject({ included: true, reason: expect.stringContaining('本次任务明确引用') });
    }
    expect(pack.characters).toBeLessThanOrEqual(pack.budget);
  });

  it('引用远处资料时优先选择，并在预算不足时明确列出未纳入的引用', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-context-explicit-gap-'));
    roots.push(root);
    const project = new ProjectService('context-explicit-gap');
    await project.create({ root, title: '引用预算', kind: 'novel' });
    await project.writeFile('research/人物原型.txt', '原型访谈。'.repeat(350));
    await project.writeFile('manuscript/第101章.md', '最后一次会面。'.repeat(500));
    const assembler = new ContextAssembler(project);
    const enough = await assembler.build({ task: '对照 research/人物原型.txt 和第101章，检查当前人物动机。', filePath: 'manuscript/第200章.md', content: '# 第200章', budget: 12_000 });
    expect(enough.items.find((item) => item.source === 'research/人物原型.txt')?.included).toBe(true);
    expect(enough.items.find((item) => item.source === 'manuscript/第101章.md')?.included).toBe(true);
    const limited = await assembler.build({ task: enough.task, filePath: 'manuscript/第200章.md', content: '# 第200章\n' + '当前正文'.repeat(850), budget: 4_000 });
    expect(limited.items.find((item) => item.kind === 'current-buffer')?.included).toBe(true);
    expect(limited.gaps.some((gap) => gap.includes('research/人物原型.txt') && gap.includes('预算'))).toBe(true);
    expect(limited.gaps.some((gap) => gap.includes('manuscript/第101章.md') && gap.includes('预算'))).toBe(true);
    expect(limited.characters).toBeLessThanOrEqual(limited.budget);
  });

  it('把旧评论的新理由连同适用范围带入后续 Agent 上下文', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-context-feedback-'));
    roots.push(root);
    const project = new ProjectService('context-feedback');
    await project.create({ root, title: '反馈上下文', kind: 'novel' });
    for (let index = 0; index < 5; index += 1) {
      const timestamp = `2026-08-30T00:00:0${index}.000Z`;
      const comment: ObserverComment = {
        id: `feedback-${index}`, issueType: '节奏', severity: 'suggestion', summary: '节奏建议', evidence: '原文证据', suggestedAction: '调整节奏', status: 'intentional', reviewCount: 0,
        anchor: { filePath: 'manuscript/第一章.md', start: 0, end: 1, quote: '#', prefix: '', suffix: '', snapshotId: 'snapshot', snapshotHash: 'hash' },
        messages: [{ id: `reason-${index}`, source: 'author', body: '有意保留', createdAt: timestamp }], createdAt: timestamp, updatedAt: timestamp
      };
      await project.eventStore.append('comment.created', comment as never, 'observer');
    }
    const first = (await project.state()).comments[0];
    const reason = '本章保留安静收束；仅适用于这次场景，不是全书通用规则。';
    await project.eventStore.append('comment.updated', { ...first, messages: [...first.messages, { id: 'supplement', source: 'author', body: reason, createdAt: '2026-08-31T00:00:00.000Z' }, { id: 'review-1', source: 'observer', body: '解释一', createdAt: '2026-08-31T00:00:01.000Z' }, { id: 'review-2', source: 'observer', body: '解释二', createdAt: '2026-08-31T00:00:02.000Z' }] } as never, 'author');
    const pack = await new ContextAssembler(project).build({ task: '继续下一场景', budget: 12_000 });
    const item = pack.items.find((candidate) => candidate.kind === 'workbench-state');
    expect(item?.included).toBe(true);
    const state = JSON.parse(item!.content);
    expect(state.recentAuthorFeedback.map((comment: { id: string }) => comment.id)).toEqual(['feedback-0', 'feedback-4', 'feedback-3']);
    expect(state.recentAuthorFeedback[0].latestAuthorFeedback.body).toBe(reason);
    expect(state.recentAuthorFeedback[0].status).toBe('intentional');
  });

  it('Researcher 产物可被相关任务选入，并明确不等于正典', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-context-research-'));
    roots.push(root);
    const project = new ProjectService('context-research');
    await project.create({ root, title: '研究上下文', kind: 'novel' });
    await project.writeFile('research/栖山城档案.md', '# 栖山城档案\n\n五十三年前发生碑型协议事故，来源仍待交叉验证。');
    for (let index = 0; index < 12; index += 1) await project.writeFile(`manuscript/资料干扰-${index}.md`, `# 干扰正文\n\n栖山城事故相关讨论 ${'普通正文'.repeat(180)}`);
    const file = (await project.state()).files.find((item) => item.path === 'research/栖山城档案.md');
    expect(file?.category).toBe('research');
    const pack = await new ContextAssembler(project).build({ task: '核对栖山城碑型协议事故', budget: 4_000 });
    const research = pack.items.find((item) => item.source === 'research/栖山城档案.md');
    expect(research).toMatchObject({ included: true, kind: 'research' });
    expect(research?.reason).toContain('尚不等于正典');
  });

  it('大量高相关研究资料不会把正典、规划和工作台状态全部挤出预算', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-context-essential-'));
    roots.push(root);
    const project = new ProjectService('context-essential');
    await project.create({ root, title: '长篇上下文', kind: 'novel', idea: '冷点群与回程节点' });
    for (let index = 0; index < 18; index += 1) await project.writeFile(`research/冷点研究-${index}.md`, `# 冷点研究\n\n冷点群 回程节点 多目标谱 ${'相关研究'.repeat(220)}`);
    const pack = await new ContextAssembler(project).build({ task: '核对冷点群与回程节点多目标谱', budget: 4_000 });
    expect(pack.items.some((item) => item.included && item.kind === 'canon')).toBe(true);
    expect(pack.items.some((item) => item.included && item.kind === 'planning')).toBe(true);
    expect(pack.items.some((item) => item.included && item.kind === 'workbench-state')).toBe(true);
    expect(pack.characters).toBeLessThanOrEqual(pack.budget);
  });

  it('超长结构化状态不会挤掉当前章之前的两章正文', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-context-recent-chapters-'));
    roots.push(root);
    const project = new ProjectService('context-recent-chapters');
    await project.create({ root, title: '长篇临近正文', kind: 'novel', idea: '临时上限与新额定' });
    await project.writeFile('manuscript/第405章.md', `# 第405章\n\n${'公开责任与历史批准。'.repeat(180)}`);
    await project.writeFile('manuscript/第406章.md', `# 第406章\n\n${'共同基金与先赔后归责。'.repeat(180)}`);
    await project.writeFile('manuscript/第407章.md', `# 第407章\n\n${'临时上限不能变成新额定。'.repeat(180)}`);
    await project.writeFile('manuscript/第三卷/第152章.md', `# 第152章\n\n${'完全无关的旧卷内容。'.repeat(180)}`);
    for (let index = 0; index < 24; index += 1) {
      await project.eventStore.append('fact.upsert', { id: `fact-long-${index}`, category: 'world-rule', subject: `临时上限规则${index}`, statement: `临时上限、当前额定、责任账与历史批准必须分开。${'结构化长事实'.repeat(40)}`, status: 'author-confirmed', evidence: [{ filePath: 'manuscript/第407章.md', quote: '临时上限不能变成新额定。' }], updatedAt: new Date().toISOString() }, 'author');
    }
    const current = await project.readFile('manuscript/第407章.md');
    const pack = await new ContextAssembler(project).build({ task: '续写标签模板把临时上限错写成新额定的召回', filePath: current.path, content: current.content, budget: 28_000 });
    expect(pack.items.find((item) => item.kind === 'workbench-state')?.characters).toBeLessThan(8_000);
    expect(pack.items.find((item) => item.source === 'manuscript/第405章.md')?.included).toBe(true);
    expect(pack.items.find((item) => item.source === 'manuscript/第406章.md')?.included).toBe(true);
    expect(pack.items.find((item) => item.source === 'manuscript/第三卷/第152章.md')?.included ?? false).toBe(false);
    expect(pack.characters).toBeLessThanOrEqual(pack.budget);
  });
});
