import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { ProjectService } from '../electron/main/project.js';
import { addReviewReferences, automaticReviewTargets, buildReviewBundle, finishReview, pendingReview, validateReviewQuotes, writerReviewOutcome } from '../electron/main/literary-review.js';
import { hashText } from '../electron/main/utils.js';
import { REVIEW_DIMENSIONS } from '../src/shared/constants.js';
import type { ObserverRunRequest } from '../src/shared/types.js';
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'literary-review-')); roots.push(root);
  const project = new ProjectService('review-test');
  await project.create({ root, title: '审阅测试', kind: 'novel' });
  for (const [name, text] of [['第一章', '她把杯子放下。'], ['第2章', '杯子仍在桌上。'], ['第三章', '他问她要去哪里。'], ['第4章', '她没有回答，推门走了。'], ['第五章', '门外的街道空了。'], ['第6章', '另一段故事。']]) await project.writeFile(`manuscript/${name}.md`, `# ${name}\n${text}`);
  const file = await project.readFile('manuscript/第五章.md');
  const input: ObserverRunRequest = { adapterId: 'codex', mode: 'manual', reviewScope: 'sequence', reviewWindow: 5, reportId: 'test-report', snapshot: { id: 'snapshot', filePath: file.path, hash: file.hash, content: file.content, editorVersion: 1, createdAt: new Date().toISOString() } };
  const bundle = await buildReviewBundle(project, input);
  return { project, input: { ...input, bundle }, bundle };
}
function chapterReadings(input: ObserverRunRequest) { return input.bundle!.sources.map((source) => ({ filePath: source.filePath, change: '本章的场景推进。', evidence: [{ filePath: source.filePath, quote: source.content }] })); }
function completeAssessments(input: ObserverRunRequest) {
  return Object.keys(REVIEW_DIMENSIONS).map((dimension) => ({ dimension, status: 'clear', finding: '已检查此段动作与回应。', evidence: [{ filePath: input.snapshot.filePath, quote: '门外的街道空了。' }, { filePath: input.bundle!.sources[0].filePath, quote: '她把杯子放下。' }] }));
}
describe('有证据的文学审阅', () => {
  it('混合中文数字章节按自然顺序读取连续五章全文，不把后一章误纳入', async () => {
    const { bundle } = await fixture();
    expect(bundle.sources.map((source) => source.filePath)).toEqual(['manuscript/第一章.md', 'manuscript/第2章.md', 'manuscript/第三章.md', 'manuscript/第4章.md', 'manuscript/第五章.md']);
    expect(bundle.sources[0].content).toContain('她把杯子放下。');
    expect(bundle.gaps).toEqual([]);
  });
  it('当前未保存快照优先，超预算整章明确列缺口，拒绝伪造快照哈希', async () => {
    const { project, input } = await fixture();
    const content = '# 第五章\n作者尚未保存的新句。';
    const next = { ...input, snapshot: { ...input.snapshot, content, hash: hashText(content) } };
    const bundle = await buildReviewBundle(project, next, content.length + 1);
    expect(bundle.sources).toHaveLength(1); expect(bundle.sources[0].content).toBe(content);
    expect(bundle.omittedPaths).toHaveLength(4); expect(bundle.gaps.length).toBeGreaterThan(0);
    await expect(buildReviewBundle(project, { ...next, snapshot: { ...next.snapshot, hash: 'fabricated' } })).rejects.toThrow('哈希');
  });
  it('空评论、缺维度、重复维度、虚构证据均不能被标成已完整检查', async () => {
    const { input, bundle } = await fixture(); const report = pendingReview(input, 'task');
    expect(finishReview(report, bundle, { comments: [], summary: '没问题' }, [], []).status).toBe('incomplete');
    const assessments = completeAssessments(input);
    expect(finishReview(report, bundle, { assessments, chapterReadings: chapterReadings(input) }, [], []).status).toBe('clear');
    expect(finishReview(report, bundle, { assessments: [...assessments, assessments[0]] }, [], []).status).toBe('incomplete');
    assessments[0].evidence[0].quote = '正文里没有这句话';
    expect(finishReview(report, bundle, { assessments, chapterReadings: chapterReadings(input) }, [], []).status).toBe('incomplete');
  });
  it('跨章证据逐字验证，无法定位的意见保留，重复短引文不任意选第一处', async () => {
    const { input, bundle } = await fixture();
    expect(validateReviewQuotes(bundle, { filePath: bundle.sources[0].filePath, quote: '她把杯子放下。', evidenceQuotes: [{ filePath: bundle.sources[1].filePath, quote: '杯子仍在桌上。' }] }).reason).toBe('');
    expect(validateReviewQuotes(bundle, { filePath: bundle.sources[0].filePath, quote: '她把杯子放下。', evidenceQuotes: [{ filePath: bundle.sources[1].filePath, quote: '不存在' }] }).reason).toContain('辅助');
    const missing = [{ filePath: 'manuscript/第五章.md', quote: '不存在', summary: '一条未定位意见', reason: '引文不匹配' }];
    const report = finishReview(pendingReview(input, 'task'), bundle, { assessments: completeAssessments(input), chapterReadings: chapterReadings(input) }, [], missing);
    expect(report.unanchored).toEqual(missing); expect(report.status).toBe('incomplete');
    const repeated = { ...bundle, sources: [{ ...input.snapshot, content: '嗯。嗯。' }] };
    expect(validateReviewQuotes(repeated, { filePath: input.snapshot.filePath, quote: '嗯。', start: 8, end: 10 }).reason).toContain('重复');
  });
  it('报告落盘后，任一被引用章节改变或删除都会使整份报告过期', async () => {
    const { project, input, bundle } = await fixture();
    await project.eventStore.append('review.report', finishReview(pendingReview(input, 'task'), bundle, { assessments: completeAssessments(input), chapterReadings: chapterReadings(input) }, [], []) as never, 'observer');
    expect((await project.state()).reviews?.[0].stale).toBe(false);
    await project.writeFile('manuscript/第2章.md', '杯子已经被拿走。');
    expect((await project.state()).reviews?.[0].stale).toBe(true);
  });
  it('批量重写按窗口覆盖每个实际改动文件，单文件正常精读', () => {
    const files = Array.from({ length: 15 }, (_, index) => `manuscript/第${index + 1}章.md`);
    const changed = files.filter((_, index) => [0, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14].includes(index));
    const targets = automaticReviewTargets(files, changed, false);
    const covered = new Set(targets.flatMap((target) => files.slice(Math.max(0, files.indexOf(target.filePath) - 4), files.indexOf(target.filePath) + 1)));
    expect(changed.every((file) => covered.has(file))).toBe(true);
    expect(automaticReviewTargets(files, [files[0]], false)).toEqual([{ filePath: files[0], scope: 'chapter' }]);
  });
});

it('逐章阅读证明不可缺失；联合判断不能只用最后一章替全段背书', async () => {
  const { input, bundle } = await fixture();
  const report = pendingReview(input, 'task');
  expect(finishReview(report, bundle, { assessments: completeAssessments(input) }, [], []).gaps.some((gap) => gap.includes('逐章阅读'))).toBe(true);
  const assessments = completeAssessments(input).map((row) => ({ ...row, evidence: row.evidence.slice(0, 1) }));
  const result = finishReview(report, bundle, { assessments, chapterReadings: chapterReadings(input) }, [], []);
  expect(result.status).toBe('incomplete');
  expect(result.assessments.find((row) => row.dimension === 'pacing')?.status).toBe('insufficient');
});

it('Writer交付不等于写作要求达成：未达成或漏检不能因空评论而通过', async () => {
  const { input, bundle } = await fixture();
  const report = pendingReview({ ...input, sourceWriterTaskId: 'writer', writingRequirements: '改变场景结构，而非新增解释。' }, 'task');
  const base = { assessments: completeAssessments(input), chapterReadings: chapterReadings(input) };
  expect(finishReview(report, bundle, base, [], []).status).toBe('incomplete');
  const evidence = [{ filePath: input.snapshot.filePath, quote: '门外的街道空了。' }];
  expect(finishReview(report, bundle, { ...base, taskAlignment: { status: 'unmet', finding: '场景结构尚未变化。', evidence } }, [], []).status).toBe('findings');
  expect(finishReview(report, bundle, { ...base, taskAlignment: { status: 'met', finding: '正文满足了约定要求。', evidence } }, [], []).status).toBe('clear');
});

it('手动复查和自动审阅共用完成条件，必须覆盖所有改动章且不能使用旧版报告', async () => {
  const { input, bundle } = await fixture();
  const report = finishReview(pendingReview({ ...input, sourceWriterTaskId: 'writer' }, 'review'), bundle, { assessments: completeAssessments(input), chapterReadings: chapterReadings(input), taskAlignment: { status: 'met', finding: '已核对', evidence: [{ filePath: input.snapshot.filePath, quote: '门外的街道空了。' }] } }, [], []);
  expect(writerReviewOutcome('writer', ['manuscript/第五章.md'], [report]).complete).toBe(true);
  expect(writerReviewOutcome('writer', ['manuscript/第五章.md', 'manuscript/第6章.md'], [report]).complete).toBe(false);
  expect(writerReviewOutcome('writer', ['manuscript/第五章.md'], [{ ...report, stale: true }]).complete).toBe(false);
  expect(writerReviewOutcome('different-writer', ['manuscript/第五章.md'], [report]).complete).toBe(false);
});

it('任务要求核对中的补充引文同样按启动哈希核验，不误报未覆盖', async () => {
  const { project, input, bundle } = await fixture();
  const hashes = await project.hashFiles(['manuscript/第6章.md']);
  const parsed = { taskAlignment: { status: 'met', finding: '已核对补充章', evidence: [{ filePath: 'manuscript/第6章.md', quote: '另一段故事。' }] } };
  await addReviewReferences(project, bundle, parsed, hashes);
  expect(bundle.sources.find((source) => source.filePath === 'manuscript/第6章.md')?.referenceOnly).toBe(true);
  const report = finishReview(pendingReview({ ...input, bundle, sourceWriterTaskId: 'writer' }, 'task'), bundle, { ...parsed, assessments: completeAssessments(input), chapterReadings: chapterReadings(input) }, [], []);
  expect(report.taskAlignment?.status).toBe('met');
});

it('未打开的章节改稿后，旧引文评论立即失效，历史事件仍保留', async () => {
  const { project, input } = await fixture();
  const quote = '门外的街道空了。';
  await project.eventStore.append('comment.created', { id: 'old-comment', issueType: '连贯', severity: 'warning', summary: '旧问题', evidence: quote, suggestedAction: '调整', status: 'open', reviewCount: 0, messages: [], createdAt: '2026-09-08T00:00:00Z', updatedAt: '2026-09-08T00:00:00Z', anchor: { filePath: input.snapshot.filePath, start: input.snapshot.content.indexOf(quote), end: input.snapshot.content.length, quote, prefix: '', suffix: '', snapshotId: input.snapshot.id, snapshotHash: input.snapshot.hash } }, 'observer');
  await project.writeFile(input.snapshot.filePath, '# 第五章\n她走进了热闹的街市。');
  const first = (await project.state()).comments[0];
  const second = (await project.state()).comments[0];
  expect(first.status).toBe('stale');
  expect(second.updatedAt).toBe(first.updatedAt);
  const event = (await project.eventStore.all()).find((event) => event.type === 'comment.created');
  expect((event?.payload as { status: string }).status).toBe('open');
});

it('新的任务上下文包含有效审阅观察，并排除改稿后过期的摘要', async () => {
  const { ContextAssembler } = await import('../electron/main/context.js');
  const { project, input, bundle } = await fixture();
  const report = finishReview(pendingReview(input, 'task'), bundle, { assessments: completeAssessments(input), chapterReadings: chapterReadings(input), summary: '已经发生的场景变化' }, [], []);
  await project.eventStore.append('review.report', report as never, 'observer');
  const pack = await new ContextAssembler(project).build({ task: '继续下一章', budget: 28000 });
  const state = JSON.parse(pack.items.find((item) => item.kind === 'workbench-state')!.content);
  expect(state.literaryReviews[0]).toMatchObject({ sourceId: report.id, authority: 'review-observation' });
  await project.writeFile(input.snapshot.filePath, '改稿后的新场景');
  const next = await new ContextAssembler(project).build({ task: '继续下一章', budget: 28000 });
  expect(JSON.parse(next.items.find((item) => item.kind === 'workbench-state')!.content).literaryReviews).toEqual([]);
});
