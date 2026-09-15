import { createElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { commentDecorationKey, observerCommentLayer, updateObserverComments } from '@/lib/editor-comments';
import type { ObserverComment } from '@/shared/types';

interface EditorProps {
  value: string;
  comments: ObserverComment[];
  readOnly: boolean;
  focusMode: boolean;
  onChange(value: string): void;
  onBlur(): void;
  onCreate(view: EditorView): void;
}

const EDITOR_EXTENSIONS = [markdown(), EditorView.lineWrapping, observerCommentLayer];
const BASIC_SETUP = { lineNumbers: false, foldGutter: false, highlightActiveLineGutter: false, highlightActiveLine: false, bracketMatching: false, autocompletion: false, closeBrackets: false, rectangularSelection: false };

export function Editor({ value, comments, readOnly, focusMode, onChange, onBlur, onCreate }: EditorProps) {
  // The parent also renders for CLI progress. Callback identity must not cause
  // @uiw/react-codemirror to dispatch StateEffect.reconfigure on every token.
  const callbacks = useRef({ onChange, onBlur, onCreate });
  useLayoutEffect(() => { callbacks.current = { onChange, onBlur, onCreate }; });
  const [view, setView] = useState<EditorView | null>(null);
  const handleChange = useCallback((content: string) => callbacks.current.onChange(content), []);
  const handleBlur = useCallback(() => callbacks.current.onBlur(), []);
  const handleCreate = useCallback((editor: EditorView) => { setView(editor); callbacks.current.onCreate(editor); }, []);
  const decorationKey = commentDecorationKey(comments);
  useEffect(() => {
    if (view) view.dispatch({ effects: updateObserverComments.of(comments) });
    // Refresh only when visible annotation data changes, not on cloned reports.
  }, [view, decorationKey]);
  return (
    <div className={`editor-shell ${focusMode ? 'focus-mode' : ''}`} onBlur={handleBlur}>
      <CodeMirror
        value={value}
        height="100%"
        extensions={EDITOR_EXTENSIONS}
        editable={!readOnly}
        readOnly={readOnly}
        basicSetup={BASIC_SETUP}
        theme="none"
        onChange={handleChange}
        onCreateEditor={handleCreate}
      />
    </div>
  );
}

export function MarkdownPreview({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  return (
    <article className="markdown-preview">
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        const heading = trimmed.match(/^(#{1,4})\s+(.+)$/s);
        if (heading) {
          return createElement(`h${heading[1].length}`, { key: index }, heading[2]);
        }
        if (trimmed.split('\n').every((line) => /^[-*]\s+/.test(line))) return <ul key={index}>{trimmed.split('\n').map((line) => <li key={line}>{line.replace(/^[-*]\s+/, '')}</li>)}</ul>;
        return <p key={index}>{trimmed.split('\n').map((line, lineIndex) => <span key={lineIndex}>{line}{lineIndex < trimmed.split('\n').length - 1 && <br />}</span>)}</p>;
      })}
    </article>
  );
}
