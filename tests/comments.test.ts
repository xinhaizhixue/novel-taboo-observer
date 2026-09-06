import { describe, expect, it } from 'vitest';
import { commentStatusLabel, partitionObserverComments, recentAuthorFeedback } from '../src/lib/comments.js';
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

  it('更新旧评论的理由也按作者反馈时间进入最近上下文', () => {
    const updatedOld = comment('first-created', 'intentional', '2026-08-30T00:00:01.000Z', true);
    updatedOld.messages.push({ id: 'new-intent', source: 'author', body: '仅保留本次叙事节奏', createdAt: '2026-08-31T00:00:00.000Z' });
    const entries = [updatedOld, ...[2, 3, 4].map((index) => comment(`later-${index}`, 'rejected', `2026-08-30T00:00:0${index}.000Z`, true))];
    const recent = recentAuthorFeedback(entries);
    expect(recent.map((item) => item.comment.id)).toEqual(['first-created', 'later-4', 'later-3']);
    expect(recent[0].latestAuthorFeedback.body).toBe('仅保留本次叙事节奏');
    expect(entries[0].id).toBe('first-created');
    expect(recentAuthorFeedback(entries, 0)).toEqual([]);
  });

  it('后续 Observer 消息不改变作者反馈顺序，也不抹去理由', () => {
    const old = comment('old', 'resolved', '2026-08-30T00:00:01.000Z', true);
    old.updatedAt = '2026-09-01T00:00:00.000Z';
    old.messages.push(...[1, 2, 3].map((index) => ({ id: `review-${index}`, source: 'observer' as const, body: '复查消息', createdAt: old.updatedAt })));
    const newer = comment('new', 'intentional', '2026-08-31T00:00:00.000Z', true);
    expect(recentAuthorFeedback([old, newer]).map((item) => item.comment.id)).toEqual(['new', 'old']);
    expect(recentAuthorFeedback([old])[0].latestAuthorFeedback.body).toBe('已反馈');
    expect(recentAuthorFeedback([comment('no-author', 'open', old.updatedAt)])).toEqual([]);
  });
});
