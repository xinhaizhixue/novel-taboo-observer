import { EditorState, StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import { observerCommentDecorations } from '../src/lib/editor-comments.js';
import type { ObserverComment } from '../src/shared/types.js';

function comment(start: number, end: number, quote: string, status: ObserverComment['status'] = 'open'): ObserverComment {
  return { id: 'comment', issueType: '测试', severity: 'warning', summary: '测试', evidence: '测试', suggestedAction: '测试', status, reviewCount: 0, messages: [], createdAt: '', updatedAt: '', anchor: { start, end, quote, filePath: 'manuscript/chapter.md', prefix: '', suffix: '', snapshotId: '', snapshotHash: '' } };
}

function ranges(state: EditorState) {
  const result: Array<[number, number]> = [];
  for (const provider of state.facet(EditorView.decorations)) {
    if (typeof provider === 'function') throw new Error('Expected state-derived decorations');
    for (const range = provider.iter(); range.value; range.next()) result.push([range.from, range.to]);
  }
  return result;
}

describe('评论装饰始终属于当前编辑器文档', () => {
  it('短资料先收到长章评论扩展，再替换正文，也不会越界', () => {
    const short = '短'.repeat(1068);
    const long = `${'长'.repeat(2892)}有效引文${'文'.repeat(100)}`;
    const extension = observerCommentDecorations([comment(2892, 2896, '有效引文')]);
    let state = EditorState.create({ doc: short });
    state = state.update({ effects: StateEffect.reconfigure.of([extension]) }).state;
    expect(ranges(state)).toEqual([]);
    state = state.update({ changes: { from: 0, to: short.length, insert: long } }).state;
    expect(ranges(state)).toEqual([[2892, 2896]]);
  });

  it('长文换成短文时即使旧评论还没更新，也不保留旧范围', () => {
    let state = EditorState.create({ doc: '前'.repeat(50) + '引文', extensions: [observerCommentDecorations([comment(50, 52, '引文')])] });
    expect(ranges(state)).toEqual([[50, 52]]);
    state = state.update({ changes: { from: 0, to: state.doc.length, insert: '短文' } }).state;
    expect(ranges(state)).toEqual([]);
    state = state.update({ changes: { from: 0, insert: '继续写' } }).state;
    expect(ranges(state)).toEqual([]);
  });

  it('同长度替换也按引文重新判断，不把评论贴到无关文字', () => {
    let state = EditorState.create({ doc: '这里是引文', extensions: [observerCommentDecorations([comment(3, 5, '引文')])] });
    expect(ranges(state)).toEqual([[3, 5]]);
    state = state.update({ changes: { from: 3, to: 5, insert: '新句' } }).state;
    expect(ranges(state)).toEqual([]);
  });

  it('不裁剪损坏锚点，也不渲染过期或已处理评论', () => {
    const candidates = [comment(-1, 2, '正文'), comment(0, 99, '正文'), comment(Number.NaN, 2, '正文'), comment(2, 1, ''), ...(['resolved', 'rejected', 'intentional', 'obsolete', 'stale'] as const).map((status) => comment(0, 2, '正文', status))];
    const state = EditorState.create({ doc: '正文', extensions: [observerCommentDecorations(candidates)] });
    expect(ranges(state)).toEqual([]);
  });
});
