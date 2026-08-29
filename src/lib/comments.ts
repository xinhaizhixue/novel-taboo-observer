import type { CommentStatus, ObserverComment } from '../shared/types';

export function commentNeedsAction(comment: ObserverComment) {
  if (['resolved', 'rejected', 'intentional', 'obsolete'].includes(comment.status)) return false;
  if (comment.status !== 'stale') return true;
  return comment.reviewCount === 0 && comment.messages.some((message) => message.source === 'author');
}

export function partitionObserverComments(comments: ObserverComment[]) {
  const ordered = [...comments].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return {
    actionable: ordered.filter(commentNeedsAction),
    history: ordered.filter((comment) => !commentNeedsAction(comment))
  };
}

const STATUS_LABELS: Partial<Record<CommentStatus, string>> = {
  resolved: '已解决', rejected: '已拒绝', intentional: '有意保留', obsolete: '已失效', stale: '旧版本'
};

export function commentStatusLabel(status: CommentStatus) {
  return STATUS_LABELS[status] || status;
}
