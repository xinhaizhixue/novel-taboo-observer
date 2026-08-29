import { describe, expect, it } from 'vitest';
import { addAuthorContextNote, setContextItemIncluded } from '../src/lib/context-pack.js';
import type { ContextPack } from '../src/shared/types.js';

function pack(): ContextPack {
  return {
    id: 'context-1', task: '续写', createdAt: '2026-01-01T00:00:00.000Z', budget: 100, characters: 50, gaps: [],
    items: [
      { id: 'current', kind: 'current-buffer', title: '当前正文', source: 'manuscript/第一章.md', content: '正文', reason: '当前任务', characters: 30, included: true },
      { id: 'canon', kind: 'canon', title: '正典', source: 'canon/故事正典.md', content: '正典', reason: '相关正典', characters: 20, included: true },
      { id: 'research', kind: 'research', title: '研究', source: 'research/资料.md', content: '研究', reason: '相关资料', characters: 60, included: false }
    ]
  };
}

describe('作者调整任务上下文包', () => {
  it('允许排除候选内容，但不允许排除当前任务正文', () => {
    const excluded = setContextItemIncluded(pack(), 'canon', false);
    expect(excluded.pack.characters).toBe(30);
    expect(excluded.pack.items.find((item) => item.id === 'canon')?.included).toBe(false);
    expect(setContextItemIncluded(pack(), 'current', false).error).toContain('不能排除');
  });

  it('阻止超预算加入，并允许在剩余预算内补充作者说明', () => {
    expect(setContextItemIncluded(pack(), 'research', true).error).toContain('超过上下文预算');
    const added = addAuthorContextNote(pack(), '只把这句话作为临时例外。', 'note-1');
    expect(added.error).toBeUndefined();
    expect(added.pack.items.at(-1)).toMatchObject({ kind: 'author-note', included: true });
    expect(added.pack.characters).toBeGreaterThan(50);
  });
});
