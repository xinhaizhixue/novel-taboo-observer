import { expect, it } from 'vitest';
import { readabilityRewriteTask } from '../src/lib/readability-task';
import type { ReviewReport } from '../src/shared/types';

const report: ReviewReport = {
  id: 'review-current', taskId: 'observer', scope: 'sequence', status: 'clear', primaryFile: 'manuscript/第二章.md', createdAt: 'now', summary: '模型未发现问题',
  sources: [{ filePath: 'manuscript/第一章.md', hash: 'a' }, { filePath: 'manuscript/第二章.md', hash: 'b' }, { filePath: 'canon/说明.md', hash: 'c', referenceOnly: true }],
  omittedPaths: [], gaps: [], assessments: [], commentIds: [], unanchored: []
};

it('作者读不懂时生成覆盖报告正文范围的重写任务，并保留作者验收门槛', () => {
  const task = readabilityRewriteTask(report, '人物位置与场景转接读不清');
  expect(task).toMatchObject({ status: 'now', kind: 'revision', assignee: 'writer', requiresAuthorReadability: true, links: ['manuscript/第一章.md', 'manuscript/第二章.md'] });
  expect(task.description).toContain('人物位置与场景转接读不清');
  expect(task.completionCriteria?.at(-1)).toContain('作者亲自顺读确认');
  expect(() => readabilityRewriteTask({ ...report, sources: [] }, '读不懂')).toThrow('没有可修订的正文范围');
});
