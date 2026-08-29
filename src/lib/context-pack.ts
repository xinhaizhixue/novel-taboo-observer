import type { ContextPack } from '@/shared/types';

function recount(pack: ContextPack, items: ContextPack['items']) {
  return { ...pack, items, characters: items.filter((item) => item.included).reduce((sum, item) => sum + item.characters, 0) };
}

export function setContextItemIncluded(pack: ContextPack, itemId: string, included: boolean): { pack: ContextPack; error?: string } {
  const target = pack.items.find((item) => item.id === itemId);
  if (!target) return { pack, error: '找不到这条上下文内容。' };
  if (target.kind === 'current-buffer' && !included) return { pack, error: '当前任务直接作用的正文不能排除；请缩小任务范围或切换文件。' };
  const next = recount(pack, pack.items.map((item) => item.id === itemId ? { ...item, included } : item));
  if (next.characters > next.budget) return { pack, error: `加入后将超过上下文预算 ${next.budget.toLocaleString()} 字符。请先排除其他内容。` };
  return { pack: next };
}

export function addAuthorContextNote(pack: ContextPack, contentInput: string, id: string): { pack: ContextPack; error?: string } {
  const content = contentInput.trim();
  if (!content) return { pack, error: '请先填写要补充给 Agent 的内容。' };
  const note = { id, kind: 'author-note', title: '作者补充', source: 'author://task-context', content, reason: '作者为本次 Agent 任务手工补充', characters: content.length, included: true };
  const next = recount(pack, [...pack.items, note]);
  if (next.characters > next.budget) return { pack, error: `补充内容将超过上下文预算 ${next.budget.toLocaleString()} 字符。请先排除其他内容或缩短补充。` };
  return { pack: next };
}
