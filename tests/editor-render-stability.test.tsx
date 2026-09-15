// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { EditorView } from '@codemirror/view';
import { StateEffect } from '@codemirror/state';
import { language } from '@codemirror/language';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Editor } from '../src/components/Editor';
import type { ObserverComment } from '../src/shared/types';

let root: Root; let container: HTMLDivElement; let view: EditorView;
const text = '# 滚动规划\n\n## 第二章：靠过去就没有退路\n\n承接求救，众人靠岸。';
const base = { value: text, comments: [] as ObserverComment[], readOnly: false, focusMode: false, onChange: (_: string) => {}, onBlur: () => {}, onCreate: (created: EditorView) => { view = created; } };
beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });
async function render(props: Partial<typeof base> = {}) { await act(async () => root.render(createElement(Editor, { ...base, ...props }))); }
function reconfigurations(calls: unknown[][]) {
  return calls.filter(call => call.some(spec => {
    const effects = (spec as { effects?: StateEffect<unknown> | StateEffect<unknown>[] })?.effects;
    return (Array.isArray(effects) ? effects : effects ? [effects] : []).some(effect => effect.is(StateEffect.reconfigure));
  }));
}
it('后台进度触发30次父组件刷新时，不重配解析器，也不替换标题DOM或编辑器', async () => {
  await render();
  const originalView = view; const parser = view.state.facet(language);
  const heading = [...container.querySelectorAll('.cm-line')].find(line => line.textContent?.includes('第二章'))!;
  await act(async () => view.dispatch({ selection: { anchor: 5 } }));
  view.scrollDOM.scrollTop = 120;
  const dispatch = vi.spyOn(view, 'dispatch');
  for (let i = 0; i < 30; i++) await render({ comments: [], onChange: () => {}, onBlur: () => {}, onCreate: created => { view = created; } });
  expect(view).toBe(originalView); expect(view.state.facet(language)).toBe(parser);
  expect(reconfigurations(dispatch.mock.calls)).toHaveLength(0);
  expect([...container.querySelectorAll('.cm-line')].find(line => line.textContent?.includes('第二章'))).toBe(heading);
  expect(view.state.selection.main.anchor).toBe(5); expect(view.scrollDOM.scrollTop).toBe(120);
});
it('评论新增、克隆和关闭仅更新标记，编辑回调始终调用最新版本', async () => {
  await render(); const parser = view.state.facet(language); const dispatch = vi.spyOn(view, 'dispatch');
  const start = text.indexOf('承接求救');
  const comment: ObserverComment = { id:'c',issueType:'测试',severity:'warning',summary:'建议',evidence:'证据',suggestedAction:'修改',status:'open',reviewCount:0,messages:[],createdAt:'',updatedAt:'',anchor:{start,end:start+4,quote:'承接求救',filePath:'planning/滚动规划.md',prefix:'',suffix:'',snapshotId:'s',snapshotHash:'h'} };
  await render({ comments:[comment] }); expect(container.querySelector('.observer-mark')?.textContent).toBe('承接求救');
  const transactions = dispatch.mock.calls.length;
  await render({ comments:[structuredClone(comment)] }); expect(dispatch.mock.calls).toHaveLength(transactions);
  await render({ comments:[{...comment,status:'resolved'}] }); expect(container.querySelector('.observer-mark')).toBeNull();
  expect(view.state.facet(language)).toBe(parser); expect(reconfigurations(dispatch.mock.calls)).toHaveLength(0);
  const latest = vi.fn(); await render({ onChange: latest });
  await act(async () => view.dispatch({ changes:{from:text.length,insert:'新句'} }));
  expect(latest).toHaveBeenCalledWith(text+'新句');
});
