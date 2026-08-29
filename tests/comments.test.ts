import { describe, expect, it } from 'vitest';
import { commentStatusLabel, partitionObserverComments } from '../src/lib/comments.js';
import type { ObserverComment } from '../src/shared/types.js';

function comment(id: string, status: ObserverComment['status'], updatedAt: string, authorFeedback = false): ObserverComment {
  return {
    id, issueType: '连续性', severity: 'warning', summary: id, evidence: '证据', suggestedAction: '建议', status, reviewCount: status === 'resolved' ? 1 : 0,
    anchor: { filePath: 'manuscript/第一章.md', start: 0, end: 1, quote: '字', prefix: '', suffix: '', snapshotId: 'snapshot', snapshotHash: 'hash' },
    messages: authorFeedback ? [{ id: `${id}-message`, source: 'author', body: '已反馈', createdAt: updatedAt }] : [], createdAt: updatedAt, updatedAt
  };
}

describe('Observer 评论面板分区', () => {
  it('保留已解决、拒绝、有意保留、失效和旧版本评论作为可追溯历史', () => {
    const result = partitionObserverComments([
      comment('open', 'open', '2026-08-30T00:00:01.000Z'),
      comment('resolved', 'resolved', '2026-08-30T00:00:05.000Z'),
      comment('rejected', 'rejected', '2026-08-30T00:00:04.000Z'),
      comment('intentional', 'intentional', '2026-08-30T00:00:03.000Z'),
      comment('stale', 'stale', '2026-08-30T00:00:02.000Z')
    ]);

    expect(result.actionable.map((item) => item.id)).toEqual(['open']);
    expect(result.history.map((item) => item.id)).toEqual(['resolved', 'rejected', 'intentional', 'stale']);
    expect(commentStatusLabel('resolved')).toBe('已解决');
  });

  it('作者已经反馈但尚未复查的旧锚点仍留在待处理区', () => {
    const result = partitionObserverComments([comment('stale-feedback', 'stale', '2026-08-30T00:00:00.000Z', true)]);
    expect(result.actionable.map((item) => item.id)).toEqual(['stale-feedback']);
    expect(result.history).toHaveLength(0);
  });
});
