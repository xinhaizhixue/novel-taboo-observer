import { useEffect, useState } from 'react';
import { REVIEW_DIMENSIONS } from '../shared/constants';
import type { AgentAdapterInfo, ObserverComment, ProjectState, ReviewScope, Settings } from '../shared/types';
import { fileTitle } from '../lib/format';

export function ReviewPanel({ project, currentFile, settings, agents, adapter, onAdapter, onRun, onCancel, onOpen, onComment, onSettings, onRefresh }: {
  project: ProjectState; currentFile?: string; settings: Settings; agents: AgentAdapterInfo[]; adapter: AgentAdapterInfo['id'];
  onAdapter(value: AgentAdapterInfo['id']): void; onRun(file: string, scope: ReviewScope, window: number, sourceWriterTaskId?: string): Promise<void>;
  onCancel(id: string): Promise<void>; onOpen(file: string): void; onComment(comment: ObserverComment): void;
  onSettings(patch: Partial<Settings>): Promise<void>; onRefresh(): Promise<void>;
}) {
  const files = project.files.filter((file) => file.category === 'manuscript');
  const [file, setFile] = useState(currentFile || files.at(-1)?.path || '');
  const [scope, setScope] = useState<ReviewScope>('sequence');
  const [reviewWindow, setWindow] = useState(5);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { if (!files.some((item) => item.path === file)) setFile(files.at(-1)?.path || ''); }, [file, files]);
  const reports = [...(project.reviews ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const running = project.agentTasks.filter((task) => task.role === 'observer' && task.state === 'running');
  const covered = new Set(reports.filter((report) => !report.stale && ['clear', 'findings'].includes(report.status)).flatMap((report) => report.sources.filter((source) => !source.referenceOnly).map((source) => source.filePath)));
  const statuses = { running: '审阅中', findings: '发现问题', clear: '本次未发现实质问题', incomplete: '检查不完整', failed: '审阅失败', cancelled: '已取消' };
  return <div className="page literary-review-page">
    <header><span className="eyebrow">文学审阅</span><h2>句子接得上，故事才走得远</h2><p>同时检查文字连贯、对话、语言自然度、人物选择、节奏回报和事实连续性。没有评论，不等于完成了检查。</p></header>
    <section className="review-compose">
      <label>结束章节<select aria-label="审阅结束章节" value={file} onChange={(event) => setFile(event.target.value)}>{files.map((item) => <option key={item.path} value={item.path}>{item.path.replace(/^manuscript\//, '')}</option>)}</select></label>
      {currentFile && file !== currentFile && <button onClick={() => setFile(currentFile)}>使用当前打开章节</button>}
      <label>审阅范围<select aria-label="审阅范围" value={scope} onChange={(event) => setScope(event.target.value as ReviewScope)}><option value="chapter">本章精读，参照前后章</option><option value="sequence">连续章节联合审读</option></select></label>
      {scope === 'sequence' && <label>连续章数<select aria-label="连续章数" value={reviewWindow} onChange={(event) => setWindow(Number(event.target.value))}><option value={3}>最近3章</option><option value={5}>最近5章</option></select></label>}
      <label>审阅 Agent<select aria-label="审阅 Agent" value={adapter} onChange={(event) => onAdapter(event.target.value as AgentAdapterInfo['id'])}>{agents.map((agent) => <option key={agent.id} value={agent.id} disabled={!agent.available}>{agent.name}{agent.available ? '' : '（不可用）'}</option>)}</select></label>
      <button className="primary" disabled={!file || starting || running.length > 0} onClick={async () => { setStarting(true); setError(''); try { await onRun(file, scope, reviewWindow); } catch (cause) { setError(String(cause)); } finally { setStarting(false); } }}>{starting ? '正在准备完整章节…' : '开始文学审阅'}</button>
      {error && <p role="alert" className="form-error">{error}</p>}
      <label className="review-auto"><input type="checkbox" checked={settings.review.afterWriter} onChange={(event) => void onSettings({ review: { ...settings.review, afterWriter: event.target.checked } })} />Writer 完成后自动审阅</label>
      <p className="review-hint">自动精读实际改动的正文；每{settings.review.sequenceEvery}次完成加入连续章节审读。批量改写按连续章节分组。不依赖打开的编辑器，也不自动改稿。</p>
      {running.map((task) => <div className="review-active-task" key={task.id}><span>{task.objective}</span><button onClick={() => void onCancel(task.id)}>停止本次审阅</button></div>)}
    </section>
    <div className="review-coverage"><b>{covered.size} / {files.length} 章有当前版本的完整检查记录</b><span>检查范围内没有发现问题也不保证文学质量；未检查、资料不足、失败与旧版结果分别保留。</span></div>
    {!reports.length && <section><h3>这部作品尚无逐项文学审阅记录</h3><p>旧版 Observer 的空评论不能补算为六个维度都已检查。请选择章节开始。</p></section>}
    {(showAll ? reports : reports.slice(0, 8)).map((report) => <section className={`review-report review-${report.status}`} key={report.id}>
      <div className="review-report-heading"><h3>{report.scope === 'sequence' ? '联合审读' : '本章精读'} · {fileTitle(report.primaryFile)}</h3><strong>{report.stale ? '基于旧版正文 · ' : ''}{statuses[report.status]}</strong></div>
      <small>{new Date(report.createdAt).toLocaleString()} {report.sourceWriterTaskId ? '· Writer 完成后自动发起' : '· 手动发起'}</small>
      <p>{report.summary}</p>
      {report.writingRequirements && <details><summary>本次写作要求 · {report.taskAlignment?.status === 'met' ? '已核对' : report.taskAlignment?.status === 'unmet' ? '尚未达到' : '待核对'}</summary><p>{report.writingRequirements}</p><p>{report.taskAlignment?.finding}</p>{report.taskAlignment?.evidence.map((item, index) => <blockquote key={index}>{item.quote}</blockquote>)}</details>}
      <div className="review-source-list">{report.sources.map((source) => <button key={source.filePath} onClick={() => onOpen(source.filePath)}>{source.referenceOnly ? '参考 · ' : ''}{fileTitle(source.filePath)}</button>)}</div>
      {!!report.gaps.length && <div className="review-gaps"><b>本次检查的限制</b>{report.gaps.map((gap) => <p key={gap}>{gap}</p>)}</div>}
      {!!report.chapterReadings?.length && <details className="review-chapter-readings"><summary>逐章阅读依据（{report.chapterReadings.length}章）</summary>{report.chapterReadings.map((reading) => <article key={reading.filePath}><b>{fileTitle(reading.filePath)}</b><p>{reading.change}</p>{reading.evidence.map((item, index) => <blockquote key={index}>{item.quote}</blockquote>)}</article>)}</details>}
      <div className="review-assessments">{report.assessments.map((row) => <details key={row.dimension}><summary><b>{REVIEW_DIMENSIONS[row.dimension]}</b><span>{row.status === 'issues' ? '需要修改' : row.status === 'clear' ? '已检查' : '资料不足'}</span></summary><p>{row.finding}</p>{row.evidence.map((evidence, index) => <blockquote key={index}><button onClick={() => onOpen(evidence.filePath)}>{fileTitle(evidence.filePath)}</button>{evidence.quote}</blockquote>)}</details>)}</div>
      {!!report.commentIds.length && <div className="review-findings"><h4>可处理的意见</h4>{report.commentIds.map((id) => { const comment = project.comments.find((item) => item.id === id); return comment ? <article key={id}><button onClick={() => onComment(comment)}><b>{fileTitle(comment.anchor.filePath)} · {comment.summary}</b></button><blockquote>{comment.anchor.quote}</blockquote><p>{comment.evidence}</p><p>{comment.suggestedAction}</p><button onClick={async () => { await windowApi().commentFeedback({ commentId: id, action: 'accept' }); await onRefresh(); }}>接受建议</button><button onClick={() => onComment(comment)}>定位并修改 / 复查</button></article> : null; })}</div>}
      {!!report.unanchored.length && <div className="review-gaps"><h4>待核实意见（未丢弃）</h4>{report.unanchored.map((item, index) => <p key={index}>{item.filePath}：{item.summary} — {item.reason}「{item.quote}」</p>)}</div>}
      {report.status !== 'running' && <button disabled={starting || running.length > 0} onClick={async () => { setStarting(true); setError(''); try { await onRun(report.primaryFile, report.scope, 5, report.sourceWriterTaskId); } catch (cause) { setError(String(cause)); } finally { setStarting(false); } }}>按当前版本重新审阅</button>}
    </section>)}
    {reports.length > 8 && <button onClick={() => setShowAll(!showAll)}>{showAll ? '收起历史记录' : `查看全部 ${reports.length} 次审阅`}</button>}
  </div>;
}
function windowApi() { return window.workbench; }
