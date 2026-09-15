import { EditorView, Decoration } from '@codemirror/view';
import { StateEffect, StateField, type EditorState, type Extension } from '@codemirror/state';
import type { ObserverComment } from '../shared/types.js';

function decorations(state: EditorState, comments: readonly ObserverComment[]) {
  const ranges = comments.flatMap((comment) => {
    if (['resolved', 'rejected', 'intentional', 'obsolete', 'stale'].includes(comment.status)) return [];
    const { start, end, quote } = comment.anchor;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > state.doc.length) return [];
    if (state.doc.sliceString(start, end) !== quote) return [];
    return [Decoration.mark({ class: `observer-mark observer-${comment.severity}` }).range(start, end)];
  });
  return Decoration.set(ranges, true);
}

export function observerCommentDecorations(comments: ObserverComment[]): Extension {
  // Validate against the current document, including during controlled file changes.
  return EditorView.decorations.compute(['doc'], (state) => decorations(state, comments));
}

export const updateObserverComments = StateEffect.define<readonly ObserverComment[]>();
const observerComments = StateField.define<readonly ObserverComment[]>({
  create: () => [],
  update(value, transaction) {
    for (const effect of transaction.effects) if (effect.is(updateObserverComments)) value = effect.value;
    return value;
  }
});

// Updating annotations must not reinstall the Markdown language or its parser.
export const observerCommentLayer: Extension = [observerComments, EditorView.decorations.compute([observerComments, 'doc'], state => decorations(state, state.field(observerComments)))];

export function commentDecorationKey(comments: readonly ObserverComment[]) {
  return JSON.stringify(comments.map(({ status, severity, anchor }) => [status, severity, anchor.start, anchor.end, anchor.quote]));
}
