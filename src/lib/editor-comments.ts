import { EditorView, Decoration } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import type { ObserverComment } from '../shared/types.js';

export function observerCommentDecorations(comments: ObserverComment[]): Extension {
  // React may reconfigure extensions before replacing a controlled document.
  // Derive positions from the actual CodeMirror state, never the next prop's
  // length, so a long chapter's anchors cannot enter a short document's state.
  return EditorView.decorations.compute(['doc'], (state) => {
    const ranges = comments.flatMap((comment) => {
      if (['resolved', 'rejected', 'intentional', 'obsolete', 'stale'].includes(comment.status)) return [];
      const { start, end, quote } = comment.anchor;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > state.doc.length) return [];
      if (state.doc.sliceString(start, end) !== quote) return [];
      return [Decoration.mark({ class: `observer-mark observer-${comment.severity}` }).range(start, end)];
    });
    return Decoration.set(ranges, true);
  });
}
