import { useMemo, useState } from 'react';
import { DiffModeEnum, DiffView } from '@git-diff-view/react';
import { generateDiffFile } from '@git-diff-view/file';
import { diffLines } from 'diff';
import { Columns2, FileJson2, Rows3, WrapText } from 'lucide-react';
import type { GitFileVersions } from '../shared/types';
import '@git-diff-view/react/styles/diff-view-pure.css';

function language(path: string) {
  const extension = path.split('.').at(-1)?.toLowerCase();
  if (extension === 'md' || extension === 'markdown') return 'markdown';
  if (extension === 'json' || extension === 'jsonl') return 'json';
  if (extension === 'yaml' || extension === 'yml') return 'yaml';
  return 'plaintext';
}

function eventSummary(event: Record<string, unknown>) {
  const payload = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload) ? event.payload as Record<string, unknown> : {};
  const type = String(event.type ?? 'event');
  const labels: Record<string, string> = {
    'agent.task': 'Agent 任务', 'comment.created': '新增评论', 'comment.updated': '评论更新', 'file.changed': '文件保存',
    'file.trashed': '移入回收站', 'file.restored': '从回收站恢复', 'task.upsert': '创作任务', 'goal.upsert': '创作目标',
    'project.position': '创作位置', 'proposal.created': '剧情路线候选', 'proposal.updated': '剧情路线决定', 'fact.upsert': '故事事实',
    'author-profile.linked': '作者风格档案', 'acceptance.recorded': '验收记录'
  };
  const title = String(payload.title ?? payload.summary ?? payload.objective ?? payload.path ?? payload.filePath ?? payload.id ?? labels[type] ?? type);
  const detail = [payload.role, payload.state ?? payload.status, payload.reason, payload.focus].filter(Boolean).map(String).join(' · ');
  return { type, label: labels[type] ?? type, title, detail, source: String(event.source ?? ''), createdAt: String(event.createdAt ?? '') };
}

function addedEvents(versions: GitFileVersions) {
  const lines = diffLines(versions.oldContent, versions.newContent).filter((part) => part.added).flatMap((part) => part.value.split('\n')).filter(Boolean);
  return lines.flatMap((line) => {
    try { const value = JSON.parse(line) as Record<string, unknown>; return [eventSummary(value)]; }
    catch { return []; }
  });
}

export function GitDiffViewer({ versions }: { versions: GitFileVersions }) {
  const [mode, setMode] = useState<'unified' | 'split'>('unified');
  const [wrap, setWrap] = useState(true);
  const [rawSystem, setRawSystem] = useState(false);
  const systemEvents = useMemo(() => versions.path.startsWith('.novel/events/') ? addedEvents(versions) : [], [versions]);
  const diffFile = useMemo(() => {
    if (systemEvents.length > 0 && !rawSystem) return null;
    const lang = language(versions.path);
    const normalize = (content: string) => content && !content.endsWith('\n') ? `${content}\n` : content;
    const file = generateDiffFile(versions.oldExists ? versions.path : '/dev/null', normalize(versions.oldContent), versions.newExists ? versions.path : '/dev/null', normalize(versions.newContent), lang, lang);
    file.initTheme('light');
    file.init();
    file.buildSplitDiffLines();
    file.buildUnifiedDiffLines();
    return file;
  }, [versions, rawSystem, systemEvents.length]);

  if (versions.binary) return <div className="diff-empty"><b>二进制文件无法逐行预览</b><span>Git 仍会保留变更状态，但工作台不会把不可读字节冒充正文展示。</span></div>;
  const showStructured = systemEvents.length > 0 && !rawSystem;
  return <div className="human-diff">
    <div className="diff-toolbar" role="toolbar" aria-label="差异显示方式">
      {systemEvents.length > 0 && <button className={showStructured ? 'active' : ''} onClick={() => setRawSystem(!rawSystem)}><FileJson2 size={14} />{showStructured ? '查看原始差异' : '返回事件摘要'}</button>}
      {!showStructured && <><button className={mode === 'unified' ? 'active' : ''} onClick={() => setMode('unified')}><Rows3 size={14} />统一视图</button><button className={mode === 'split' ? 'active' : ''} onClick={() => setMode('split')}><Columns2 size={14} />并排视图</button><button className={wrap ? 'active' : ''} onClick={() => setWrap((value) => !value)}><WrapText size={14} />自动换行</button></>}
    </div>
    {showStructured ? <div className="event-diff-list"><div className="event-diff-intro"><b>本次新增 {systemEvents.length} 条可迁移记录</b><span>系统事件已翻译为作者可读摘要；需要审计原始 JSON 时可随时切换。</span></div>{systemEvents.map((event, index) => <article key={`${event.createdAt}:${index}`}><span>{event.label}</span><div><b>{event.title}</b>{event.detail && <p>{event.detail}</p>}</div><time>{event.createdAt ? new Date(event.createdAt).toLocaleString() : event.source}</time></article>)}</div> : diffFile && <div className="diff-component"><DiffView diffFile={diffFile} diffViewMode={mode === 'split' ? DiffModeEnum.Split : DiffModeEnum.Unified} diffViewTheme="light" diffViewHighlight diffViewWrap={wrap} diffViewFontSize={12} /></div>}
  </div>;
}
