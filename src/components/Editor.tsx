import { createElement, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { Decoration, EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
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

function commentDecorations(comments: ObserverComment[], length: number): Extension {
  const ranges = comments
    .filter((comment) => !['resolved', 'rejected', 'intentional', 'obsolete', 'stale'].includes(comment.status))
    .map((comment) => ({ from: Math.max(0, Math.min(length, comment.anchor.start)), to: Math.max(0, Math.min(length, comment.anchor.end)), severity: comment.severity }))
    .filter((range) => range.to > range.from)
    .sort((a, b) => a.from - b.from || a.to - b.to)
    .map((range) => Decoration.mark({ class: `observer-mark observer-${range.severity}` }).range(range.from, range.to));
  return EditorView.decorations.of(Decoration.set(ranges, true));
}

export function Editor({ value, comments, readOnly, focusMode, onChange, onBlur, onCreate }: EditorProps) {
  const extensions = useMemo(() => [markdown(), EditorView.lineWrapping, commentDecorations(comments, value.length)], [comments, value.length]);
  return (
    <div className={`editor-shell ${focusMode ? 'focus-mode' : ''}`} onBlur={onBlur}>
      <CodeMirror
        value={value}
        height="100%"
        extensions={extensions}
        editable={!readOnly}
        readOnly={readOnly}
        basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLineGutter: false, highlightActiveLine: false, bracketMatching: false, autocompletion: false, closeBrackets: false, rectangularSelection: false }}
        theme="none"
        onChange={onChange}
        onCreateEditor={onCreate}
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
