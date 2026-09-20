import { agentEventText } from './lib/agent-progress';
import { Select } from './components/Select';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import {
  Activity, Archive, BookOpen, Bot, Check, ChevronRight, CircleAlert, CircleHelp, Compass, Copy, Eye, EyeOff, FileText, GitBranch,
  Columns2, Folder, FolderOpen, History, Lightbulb, ListTodo, LoaderCircle, Maximize2, MessageSquareText,
  PanelRightClose, PanelRightOpen, Play, Plus, Save, Pencil, Search, Settings as SettingsIcon, ShieldAlert,
  Sparkles, Square, Target, Trash2, Users, WandSparkles, X
} from 'lucide-react';
import { Editor, MarkdownPreview } from '@/components/Editor';
import { AgentModelSettings } from '@/components/AgentModelSettings';
import { ReviewPanel } from '@/components/ReviewPanel';
import { HelpPanel } from '@/components/HelpPanel';
import { currentTaskForAgent, suggestedObjectiveForAgent } from '@/lib/agent-task';
import { commentNeedsAction, commentStatusLabel, partitionObserverComments } from '@/lib/comments';
import { fileCharacterLabel } from '@/lib/file-labels';
import { addAuthorContextNote, setContextItemIncluded } from '@/lib/context-pack';
import { mergeThreeWay, renderThreeWayMerge, type MergeChoice } from '@/lib/three-way-merge';
import { characters, errorMessage, fileTitle, relativeTime, sha256 } from '@/lib/format';
import { clampTargetWan, isValidTargetWan, parseTargetWanDraft, targetWanDraftValue } from '@/lib/numbers';
import { DEFAULT_SETTINGS } from '@/shared/constants';
import { compareNaturalPath } from '@/shared/natural-sort';
import type {
  AgentAdapterInfo, AgentEvent, AgentRole, AgentTaskRecord, AnalysisSnapshot, AuthorProfile, AuthorStyleRule, CanonImpactAnalysis, ContextPack, CreativeTask, FileReadResult,
  GitDiff, GitFileVersions, GitPolicy, Goal, ManagedContentCategory, ObserverComment, ProjectFile, ProjectState, RepositoryInfo, SaveState, SearchResult, Settings, StoryFact, TrashEntry, TrashImpact, TrashKind
} from '@/shared/types';

type View = 'review' | 'continue' | 'journey' | 'editor' | 'planning' | 'story' | 'tasks' | 'agents' | 'comments' | 'git' | 'style' | 'settings' | 'help';
type RightTab = 'comments' | 'agents' | 'context';

interface BufferState {
  path: string;
  content: string;
  savedContent: string;
  diskHash: string;
  version: number;
  state: SaveState;
  conflict?: { diskContent: string; actualHash: string };
}

const NAVIGATION: Array<{ id: View; label: string; icon: typeof BookOpen }> = [
  { id: 'continue', label: '继续创作', icon: Play }, { id: 'journey', label: '创作旅程', icon: Compass },
  { id: 'editor', label: '正文', icon: BookOpen }, { id: 'planning', label: '大纲与剧情', icon: Lightbulb },
  { id: 'story', label: '人物与世界', icon: Users }, { id: 'tasks', label: '任务', icon: ListTodo },
  { id: 'review', label: '文学审阅', icon: Eye },
  { id: 'git', label: 'Git 变更', icon: GitBranch }, { id: 'style', label: '风格与能力', icon: Sparkles },
  { id: 'settings', label: '项目设置', icon: SettingsIcon }, { id: 'help', label: '使用帮助', icon: CircleHelp }
];

const JOURNEY = ['灵感与创作意图', '题材、读者期待和故事承诺', '主角、核心冲突和长期故事发动机', '最小可开书设定', '开篇和前三章', '当前卷和近期剧情', '逐章创作、观察和修订', '分卷收束和下一卷启动', '完结、全书修订和发布准备'];
const DeferredGitDiffViewer = lazy(() => import('@/components/GitDiffViewer').then((module) => ({ default: module.GitDiffViewer })));
function GitDiffViewer({ versions }: { versions: GitFileVersions }) { return <Suspense fallback={<div className="diff-empty"><LoaderCircle className="spin" /><b>正在加载差异阅读器…</b></div>}><DeferredGitDiffViewer versions={versions} /></Suspense>; }
export default function App() {
  const api = window.workbench;
  const browserPreview = String(api.platform) === 'browser';
  const [project, setProject] = useState<ProjectState | null>(null);
  const [view, setView] = useState<View>('continue');
  const [rightTab, setRightTab] = useState<RightTab>('comments');
  const [rightOpen, setRightOpen] = useState(true);
  const [buffer, setBuffer] = useState<BufferState | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [agents, setAgents] = useState<AgentAdapterInfo[]>([]);
  const [observerAdapter, setObserverAdapter] = useState<AgentAdapterInfo['id']>('codex');
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [contextPack, setContextPack] = useState<ContextPack | null>(null);
  const [observer, setObserver] = useState<{ active: boolean; count: number; budget: number; startedAt?: string }>({ active: false, count: 0, budget: 40 });
  const [observerRunning, setObserverRunning] = useState(false);
  const [observerTaskId, setObserverTaskId] = useState<string | null>(null);
  const [observerError, setObserverError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [agentPreset, setAgentPreset] = useState<{ role: AgentRole; objective: string; nonce: number } | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchPending, setSearchPending] = useState(false);
  const [fileCreate, setFileCreate] = useState<{ category: ProjectFile['category']; name: string; error: string; submitting: boolean } | null>(null);
  const [fileMove, setFileMove] = useState<{ file: ProjectFile; target: string; error: string; submitting: boolean } | null>(null);
  const [newWork, setNewWork] = useState<{ title: string; error: string; submitting: boolean } | null>(null);
  const [projectHub, setProjectHub] = useState<'home' | 'create' | null>(null);
  const [projectCreate, setProjectCreate] = useState({ root: '', title: '', idea: '', targetWan: 100, kind: 'novel' as 'novel' | 'series', error: '', submitting: false });
  const [repository, setRepository] = useState<RepositoryInfo | null>(null);
  const [trashEntries, setTrashEntries] = useState<TrashEntry[]>([]);
  const [trashTarget, setTrashTarget] = useState<{ kind: TrashKind; path: string } | null>(null);
  const [repositoryTrashOpen, setRepositoryTrashOpen] = useState(false);
  const editorRef = useRef<EditorView | null>(null);
  const bufferRef = useRef<BufferState | null>(null);
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const refreshQueued = useRef(false);
  const lastWriterDiskSync = useRef('');
  const lastAnalyzed = useRef('');
  const lastAnalysisAt = useRef(0);
  const rightTabRefs = useRef<Record<RightTab, HTMLButtonElement | null>>({ comments: null, agents: null, context: null });
  const hasRunningProjectAgent = Boolean(project?.agentTasks.some((task) => task.state === 'running' || task.state === 'queued'));
  useEffect(() => { bufferRef.current = buffer; }, [buffer]);
  useEffect(() => { if (rightOpen) rightTabRefs.current[rightTab]?.focus(); }, [rightOpen, rightTab]);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) {
      refreshQueued.current = true;
      await refreshInFlight.current;
      return;
    }
    do {
      refreshQueued.current = false;
      const run = api.refreshProject()
        .then((next) => {
          setProject(next);
          // A later successful watcher refresh supersedes only an earlier
          // refresh failure. Keep save/conflict/Agent errors visible.
          setNotice((current) => current?.kind === 'error' && (current.text.startsWith('项目刷新失败：') || current.text.includes("workbench:refreshProject")) ? null : current);
        })
        .catch((error) => { setNotice({ kind: 'error', text: `项目刷新失败：${errorMessage(error)}` }); });
      refreshInFlight.current = run;
      await run;
      refreshInFlight.current = null;
    } while (refreshQueued.current);
  }, [api]);
  useEffect(() => {
    if (!hasRunningProjectAgent) return;
    let cancelled = false;
    let timer = 0;
    const poll = async () => {
      await refresh();
      if (!cancelled) timer = window.setTimeout(() => void poll(), 1_000);
    };
    timer = window.setTimeout(() => void poll(), 1_000);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [hasRunningProjectAgent, refresh]);

  const applyDiskChange = useCallback((change: { path: string; hash: string; content: string }) => {
    setBuffer((current) => {
      if (!current || current.path !== change.path || current.diskHash === change.hash) return current;
      if (current.state === 'dirty' || current.state === 'saving') {
        void api.createRecovery({ path: current.path, content: current.content, reason: 'before-external-conflict' });
        return { ...current, state: 'conflict', conflict: { diskContent: change.content, actualHash: change.hash } };
      }
      return { ...current, content: change.content, savedContent: change.content, diskHash: change.hash, version: current.version + 1, state: 'saved', conflict: undefined };
    });
  }, [api]);

  const syncBufferFromDisk = useCallback((filePath: string) => {
    void api.readFile(filePath).then((file) => applyDiskChange({ path: file.path, hash: file.hash, content: file.content })).catch(() => {});
  }, [api, applyDiskChange]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([api.getSettings(), api.getRecentProject()]).then(async ([nextSettings, recent]) => {
      if (cancelled) return;
      setSettings(nextSettings);
      setObserverAdapter(nextSettings.observer.adapter);
      if (recent) {
        try { const next = await api.openProject(recent); if (!cancelled) setProject(next); } catch { /* Welcome screen explains how to open a repository. */ }
      }
      if (!cancelled) setLoading(false);
    }).catch((error) => { if (!cancelled) { setLoading(false); setNotice({ kind: 'error', text: `工作台初始化失败：${errorMessage(error)}` }); } });
    void api.listAgents().then((nextAgents) => {
      if (cancelled) return;
      setAgents(nextAgents);

    }).catch(() => { if (!cancelled) setNotice({ kind: 'info', text: 'Agent 状态检测暂未完成；写作区已可使用，可稍后在 Agent 面板重新检测。' }); });
    return () => { cancelled = true; };
  }, [api]);

  useEffect(() => {
    if (!project) { setRepository(null); setTrashEntries([]); return; }
    let cancelled = false;
    void Promise.all([api.repositoryInfo(), api.listTrash()]).then(([info, entries]) => { if (!cancelled) { setRepository(info); setTrashEntries(entries); } }).catch(() => {});
    return () => { cancelled = true; };
  }, [api, project?.root, project?.git.files.length]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => setNotice({ kind: 'error', text: `界面操作失败：${event.message || '未知错误'}` });
    const onRejection = (event: PromiseRejectionEvent) => setNotice({ kind: 'error', text: `操作未完成：${errorMessage(event.reason)}` });
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection); };
  }, []);

  useEffect(() => api.onProjectChange(() => void refresh()), [api, refresh]);
  useEffect(() => {
    if (!project || !query.trim()) { setSearchResults([]); setSearchPending(false); return; }
    let cancelled = false;
    setSearchPending(true);
    const timer = window.setTimeout(() => void api.searchProject(query).then((results) => { if (!cancelled) setSearchResults(results); }).catch(() => { if (!cancelled) setSearchResults([]); }).finally(() => { if (!cancelled) setSearchPending(false); }), 220);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [api, project?.root, query]);
  useEffect(() => api.onAgentEvent((event) => {
    setAgentEvents((events) => [...events.slice(-199), event]);
    const payload = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload) ? event.payload as Record<string, unknown> : undefined;
    const state = String(payload?.state ?? '');
    const role = String(payload?.role ?? '');
    const taskError = payload ? String(payload.error ?? '') : typeof event.payload === 'string' ? event.payload : '';
    if (event.type === 'file-change' && payload?.item && typeof payload.item === 'object' && !Array.isArray(payload.item)) {
      const item = payload.item as Record<string, unknown>;
      if (item.status === 'completed' && Array.isArray(item.changes)) {
        const current = bufferRef.current;
        const changedCurrent = current && item.changes.some((change) => change && typeof change === 'object' && !Array.isArray(change) && String((change as Record<string, unknown>).path ?? '').replaceAll('\\', '/').endsWith(`/${current.path}`));
        if (current && changedCurrent) syncBufferFromDisk(current.path);
      }
    }
    if (role === 'observer' && state === 'running') { setObserverRunning(true); setObserverTaskId(event.taskId); void refresh(); }
    if (state && state !== 'running') {
      if (role === 'observer') {
        setObserverRunning(false);
        setObserverTaskId((current) => current === event.taskId ? null : current);
        setObserverError(state === 'failed' ? taskError || 'Observer 未能完成本次检查。' : null);
      }
      if (role === 'writer' && Array.isArray(payload?.changedFiles)) {
        const current = bufferRef.current;
        if (current && payload.changedFiles.map(String).includes(current.path)) syncBufferFromDisk(current.path);
      }
      void refresh();
    }
  }), [api, refresh, syncBufferFromDisk]);

  useEffect(() => api.onExternalFileChange(applyDiskChange), [api, applyDiskChange]);

  const writerOwnsCurrentBuffer = Boolean(buffer && project?.agentTasks.some((task) => task.role === 'writer' && task.state === 'running' && task.scope.some((scope) => buffer.path === scope || buffer.path.startsWith(`${scope.replace(/\/$/, '')}/`))));
  useEffect(() => {
    if (!buffer || !writerOwnsCurrentBuffer) return;
    syncBufferFromDisk(buffer.path);
    const timer = window.setInterval(() => syncBufferFromDisk(buffer.path), 1_000);
    return () => window.clearInterval(timer);
  }, [buffer?.path, syncBufferFromDisk, writerOwnsCurrentBuffer]);
  useEffect(() => {
    if (!buffer || !project) return;
    const writer = [...project.agentTasks].sort((a, b) => (b.endedAt || b.startedAt).localeCompare(a.endedAt || a.startedAt)).find((task) => task.role === 'writer' && task.state === 'completed' && task.changedFiles.includes(buffer.path));
    if (!writer) return;
    const key = `${writer.id}:${writer.endedAt || ''}`;
    if (lastWriterDiskSync.current === key) return;
    lastWriterDiskSync.current = key;
    syncBufferFromDisk(buffer.path);
  }, [buffer?.path, project?.agentTasks, syncBufferFromDisk]);

  const openFile = useCallback(async (filePath: string) => {
    if (buffer?.state === 'dirty' && !settings.autosave.saveOnBlur) {
      setNotice({ kind: 'info', text: `“${fileTitle(buffer.path)}”还有未保存内容。请先保存，再切换文件。` });
      return;
    }
    if (buffer?.state === 'dirty' && settings.autosave.saveOnBlur) {
      const result = await api.writeFile({ path: buffer.path, content: buffer.content, expectedHash: buffer.diskHash, reason: 'switch-file' });
      if (result.conflict) { setBuffer((current) => current ? { ...current, state: 'conflict', conflict: { diskContent: result.conflict!.diskContent, actualHash: result.conflict!.actualHash } } : current); return; }
    }
    const file = await api.readFile(filePath);
    setBuffer({ path: file.path, content: file.content, savedContent: file.content, diskHash: file.hash, version: 1, state: 'saved' });
    await api.updateBufferState({ path: file.path, dirty: false, hash: file.hash, content: file.content });
    const recovery = await api.listRecovery(file.path);
    if (recovery.some((entry) => Date.parse(entry.createdAt) > Date.parse(file.modifiedAt))) setRecoveryOpen(true);
    setView('editor');
  }, [api, buffer, settings.autosave.saveOnBlur]);

  const save = useCallback(async () => {
    if (!buffer || !['dirty', 'conflict'].includes(buffer.state)) return;
    if (buffer.state === 'conflict') return;
    setBuffer((current) => current ? { ...current, state: 'saving' } : current);
    try {
      const result = await api.writeFile({ path: buffer.path, content: buffer.content, expectedHash: buffer.diskHash, reason: 'editor-save' });
      if (result.conflict) {
        setBuffer((current) => current ? { ...current, state: 'conflict', conflict: { diskContent: result.conflict!.diskContent, actualHash: result.conflict!.actualHash } } : current);
        return;
      }
      setBuffer((current) => current ? { ...current, savedContent: current.content, diskHash: result.hash, state: 'saved', conflict: undefined } : current);
    } catch (error) { setBuffer((current) => current ? { ...current, state: 'dirty' } : current); setNotice({ kind: 'error', text: errorMessage(error) }); }
  }, [api, buffer]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void save(); }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [save]);

  useEffect(() => {
    if (!buffer || buffer.state !== 'dirty' || !settings.autosave.enabled) return;
    const timer = window.setTimeout(() => void save(), settings.autosave.delayMs);
    return () => window.clearTimeout(timer);
  }, [buffer?.content, buffer?.state, save, settings.autosave.delayMs, settings.autosave.enabled]);

  useEffect(() => {
    if (!buffer || buffer.state !== 'dirty') return;
    const timer = window.setInterval(() => {
      const current = bufferRef.current;
      if (current?.state === 'dirty') void api.createRecovery({ path: current.path, content: current.content, reason: 'periodic-dirty-buffer' });
    }, settings.recovery.intervalMs);
    return () => window.clearInterval(timer);
  }, [api, buffer?.path, buffer?.state, settings.recovery.intervalMs]);

  useEffect(() => {
    const onWindowBlur = () => {
      const current = bufferRef.current;
      if (current?.state !== 'dirty') return;
      void api.createRecovery({ path: current.path, content: current.content, reason: 'window-blur' });
      if (settings.autosave.saveOnBlur) void save();
    };
    window.addEventListener('blur', onWindowBlur);
    return () => window.removeEventListener('blur', onWindowBlur);
  }, [api, save, settings.autosave.saveOnBlur]);

  const comments = useMemo(() => project?.comments.filter((comment) => !buffer || comment.anchor.filePath === buffer.path) ?? [], [project?.comments, buffer?.path]);
  const commentVersion = comments.map((comment) => `${comment.id}:${comment.updatedAt}`).join('|');
  useEffect(() => {
    if (!buffer) return;
    const timer = window.setTimeout(() => void api.relocateComments({ filePath: buffer.path, content: buffer.content }).then(() => void refresh()), 1_500);
    return () => window.clearTimeout(timer);
  }, [api, buffer?.content, buffer?.path, refresh]);
  useEffect(() => {
    if (!buffer || !commentVersion) return;
    void api.relocateComments({ filePath: buffer.path, content: buffer.content }).then(() => void refresh());
  }, [api, buffer?.path, commentVersion, refresh]);

  const changeObserverAdapter = async (adapter: AgentAdapterInfo['id']) => {
    try {
      const next = await api.updateSettings({ observer: { ...settings.observer, adapter } });
      setSettings(next); setObserverAdapter(next.observer.adapter);
    } catch (error) { setNotice({ kind: 'error', text: errorMessage(error) }); }
  };

  const analyze = useCallback(async (mode: 'automatic' | 'manual' | 'selection' | 'review' | 'explain' = 'manual', commentId?: string) => {
    if (!buffer) return;
    if (observerRunning || project?.agentTasks.some((task) => task.role === 'observer' && task.state === 'running')) {
      if (mode !== 'automatic') setNotice({ kind: 'info', text: '已有审阅正在进行；本次检查尚未启动，请完成后重试。' });
      return;
    }
    const adapter = agents.find((item) => item.id === observerAdapter && item.available)?.id;
    if (!adapter) { setNotice({ kind: 'error', text: `选定的 ${agents.find(item => item.id === observerAdapter)?.name || observerAdapter} 当前不可用，请重新检测或明确选择其他 Agent。` }); return; }
    setObserverRunning(true); setObserverTaskId(null); setObserverError(null); setRightOpen(true); setRightTab('comments');
    try {
      const hash = await sha256(buffer.content);
      const selection = editorRef.current?.state.selection.main;
      if (mode === 'selection' && (!selection || selection.from === selection.to)) { setObserverRunning(false); setNotice({ kind: 'info', text: '请先在正文中选中要定向检查的文字。' }); return; }
      const snapshot: AnalysisSnapshot = { id: crypto.randomUUID(), filePath: buffer.path, content: buffer.content, hash, editorVersion: buffer.version, selection: mode === 'selection' && selection && selection.from !== selection.to ? { start: selection.from, end: selection.to } : undefined, createdAt: new Date().toISOString() };
      const related = commentId ? project?.comments.find((item) => item.id === commentId) : undefined;
      const question = mode === 'explain' && related ? `解释这条评论的依据、适用边界与可能误判：${related.summary}；原依据：${related.evidence}` : mode === 'review' && related ? `复查这条评论在当前正文中是否已解决。原引文：${related.anchor.quote}；问题：${related.summary}；依据：${related.evidence}；原建议：${related.suggestedAction}` : undefined;
      const pack = await api.createContextPack({ task: question || '逐项精读文字连贯、对话承接、语言自然度、主角选择、节奏与事实连续性', filePath: buffer.path, content: buffer.content });
      setContextPack(pack);
      const task = await api.runObserver({ adapterId: adapter, snapshot, contextPack: pack, mode, commentId, question });
      setObserverTaskId(task.id);
      setObserver(await api.observerSession('status'));
      lastAnalyzed.current = buffer.content; lastAnalysisAt.current = Date.now();
    } catch (error) { setObserverRunning(false); setObserverTaskId(null); setNotice({ kind: 'error', text: errorMessage(error) }); }
  }, [agents, api, buffer, observerAdapter, observerRunning, project?.comments, project?.agentTasks]);

  const cancelObserver = useCallback(async () => {
    if (!observerTaskId) return;
    try { await api.cancelAgent(observerTaskId); }
    catch (error) { setNotice({ kind: 'error', text: errorMessage(error) }); }
    finally { setObserverRunning(false); setObserverTaskId(null); await refresh(); }
  }, [api, observerTaskId, refresh]);


  useEffect(() => {
    if (!observer.active || observerRunning || !buffer || settings.observer.mode === 'manual') return;
    const changed = Math.abs(characters(buffer.content) - characters(lastAnalyzed.current));
    const completedParagraph = changed >= 30 && /\n\s*\n\s*$/.test(buffer.content);
    if (changed < settings.observer.changedCharacters && !completedParagraph) return;
    const wait = Math.max(settings.observer.idleMs, settings.observer.minimumIntervalMs - (Date.now() - lastAnalysisAt.current));
    const timer = window.setTimeout(() => void analyze('automatic'), wait);
    return () => window.clearTimeout(timer);
  }, [analyze, buffer?.content, observer.active, observerRunning, settings.observer.changedCharacters, settings.observer.idleMs, settings.observer.minimumIntervalMs, settings.observer.mode]);

  const toggleObserver = async () => {
    const next = await api.observerSession(observer.active ? 'stop' : 'start');
    setObserver(next);
  };

  const updateContent = (content: string) => {
    setBuffer((current) => current ? { ...current, content, version: current.version + 1, state: current.state === 'conflict' ? 'conflict' : content === current.savedContent ? 'saved' : 'dirty' } : current);
    if (buffer) void api.updateBufferState({ path: buffer.path, dirty: content !== buffer.savedContent, hash: buffer.diskHash, content });
  };

  const chooseAndOpen = async () => {
    const current = bufferRef.current;
    if (current?.state === 'conflict') { setNotice({ kind: 'error', text: '请先处理当前文件冲突，再切换作品仓库。' }); return; }
    if (current?.state === 'dirty') {
      if (!settings.autosave.saveOnBlur) { setNotice({ kind: 'info', text: '当前正文尚未保存。请先保存，再切换作品仓库。' }); return; }
      const result = await api.writeFile({ path: current.path, content: current.content, expectedHash: current.diskHash, reason: 'switch-project' });
      if (result.conflict) { setBuffer({ ...current, state: 'conflict', conflict: { diskContent: result.conflict.diskContent, actualHash: result.conflict.actualHash } }); return; }
    }
    const root = await api.chooseProject();
    if (!root) return;
    try { setProject(await api.openProject(root)); setBuffer(null); setContextPack(null); setAgentEvents([]); setView('continue'); } catch (error) { setNotice({ kind: 'error', text: errorMessage(error) }); }
  };

  const chooseNewProjectRoot = async () => {
    const root = await api.chooseProject();
    if (root) setProjectCreate((value) => ({ ...value, root, error: '' }));
  };

  const createNewProject = async (submitted?: Pick<typeof projectCreate, 'title' | 'idea' | 'targetWan' | 'kind'>) => {
    const value = submitted ? { ...projectCreate, ...submitted } : projectCreate;
    if (!value.root || !value.title.trim() || !isValidTargetWan(value.targetWan) || value.submitting) { setProjectCreate({ ...value, error: !value.root ? '请先选择仓库位置。' : !value.title.trim() ? '请输入作品名。' : '计划篇幅必须在 5—1000 万字之间。' }); return; }
    const current = bufferRef.current;
    if (current?.state === 'conflict' || current?.state === 'dirty') { setProjectCreate((value) => ({ ...value, error: '当前正文尚未安全保存或仍有冲突，请处理后再新建作品。' })); return; }
    setProjectCreate({ ...value, error: '', submitting: true });
    try {
      const state = await api.createProject({ root: value.root, title: value.title.trim(), idea: value.idea.trim(), kind: value.kind, targetCharacters: clampTargetWan(value.targetWan) * 10_000 });
      setProject(state); setBuffer(null); setContextPack(null); setAgentEvents([]); setView('continue'); setProjectHub(null);
      setProjectCreate({ root: '', title: '', idea: '', targetWan: 100, kind: 'novel', error: '', submitting: false });
    } catch (error) { setProjectCreate((value) => ({ ...value, error: errorMessage(error), submitting: false })); }
  };

  const openProjectHub = async (mode: 'home' | 'create' = 'home') => {
    setProjectHub(mode);
    if (project) void Promise.all([api.repositoryInfo(), api.listTrash()]).then(([info, entries]) => { setRepository(info); setTrashEntries(entries); }).catch(() => {});
  };

  const requestTrash = (kind: TrashKind, path: string) => setTrashTarget({ kind, path });

  const openAgent = (role: AgentRole, objective: string) => {
    setAgentPreset({ role, objective, nonce: Date.now() });
    setRightOpen(true);
    setRightTab('agents');
  };

  const createFile = (category: ProjectFile['category']) => {
    const activeWorkRoot = project?.manifest.works.find((work) => work.id === project.manifest.activeWorkId)?.manuscriptRoot || 'manuscript';
    const base = category === 'manuscript' ? `第${(project?.files.filter((file) => file.category === 'manuscript' && (file.path === activeWorkRoot || file.path.startsWith(`${activeWorkRoot}/`))).length ?? 0) + 1}章` : '新资料';
    const activeFolder = category === 'manuscript' && buffer?.path.startsWith(`${activeWorkRoot}/`) ? buffer.path.split('/').slice(activeWorkRoot.split('/').length, -1).join('/') : '';
    setFileCreate({ category, name: [activeFolder, base].filter(Boolean).join('/'), error: '', submitting: false });
  };

  const submitCreateFile = async (submittedName?: string) => {
    if (!fileCreate || !project) return;
    const entered = (submittedName ?? fileCreate.name).trim();
    if (!entered) { setFileCreate({ ...fileCreate, error: '请输入文件名或相对路径。', submitting: false }); return; }
    const activeWorkRoot = project.manifest.works.find((work) => work.id === project.manifest.activeWorkId)?.manuscriptRoot || 'manuscript';
    const category = fileCreate.category;
    const folder = category === 'manuscript' ? activeWorkRoot : category === 'planning' ? 'planning' : category === 'research' ? 'research' : category === 'canon' ? 'canon' : 'decisions';
    const normalized = entered.replaceAll('\\', '/').replace(/^\/+/, '');
    const relative = `${folder}/${/\.(?:md|markdown|txt)$/i.test(normalized) ? normalized : `${normalized}.md`}`;
    setFileCreate({ ...fileCreate, error: '', submitting: true });
    try {
      const heading = normalized.split('/').at(-1)?.replace(/\.(?:md|markdown|txt)$/i, '') || '新文件';
      await api.writeFile({ path: relative, content: `# ${heading}\n\n`, createOnly: true, reason: 'author-create-file' });
      await refresh();
      await openFile(relative);
      setFileCreate(null);
    } catch (error) { setFileCreate((current) => current ? { ...current, error: errorMessage(error), submitting: false } : current); }
  };

  if (loading) return <div className="loading-screen"><LoaderCircle className="spin" /><span>正在恢复写作现场…</span></div>;
  if (!project) return <Welcome onOpen={chooseAndOpen} onCreated={(state) => { setProject(state); setView('continue'); }} notice={notice} />;

  const selectNavigation = (next: View) => {
    setView(next);
    if (next === 'git' || next === 'review') setRightOpen(false);
    if (next === 'agents') { setRightOpen(true); setRightTab('agents'); }
    if (next === 'comments') { setRightOpen(true); setRightTab('comments'); }
    if (next === 'editor' && !buffer) { const first = project.files.find((file) => file.category === 'manuscript'); if (first) void openFile(first.path); }
  };

  const activeWriter = project.agentTasks.find((task) => task.state === 'running' && task.role === 'writer' && buffer && task.scope.some((scope) => buffer.path === scope || buffer.path.startsWith(`${scope}/`)));
  const contextualComments = buffer ? comments.filter((comment) => comment.anchor.filePath === buffer.path) : comments;
  const rightCommentCount = partitionObserverComments(contextualComments).actionable.length;
  const activeBufferFile = buffer ? project.files.find((file) => file.path === buffer.path) : undefined;
  const saveLabel: Record<SaveState, string> = { saved: '已保存', dirty: '未保存', saving: '正在保存', 'agent-editing': 'Agent 正在修改', 'observer-running': 'Observer 分析中', 'stale-analysis': '分析结果已过期', conflict: '存在冲突' };
  const moveProjectFile = (file: ProjectFile) => {
    if (buffer?.path === file.path && buffer.state !== 'saved') { setNotice({ kind: 'info', text: '当前文件还有未保存内容，请先保存再移动。' }); return; }
    setFileMove({ file, target: file.path, error: '', submitting: false });
  };

  const submitMoveFile = async (submittedTarget?: string) => {
    if (!fileMove) return;
    const target = (submittedTarget ?? fileMove.target).trim().replaceAll('\\', '/').replace(/^\/+/, '');
    if (!target) { setFileMove({ ...fileMove, error: '请输入仓库内的新路径。', submitting: false }); return; }
    if (target === fileMove.file.path) { setFileMove(null); return; }
    setFileMove({ ...fileMove, target, error: '', submitting: true });
    try {
      const state = await api.moveFile({ from: fileMove.file.path, to: target });
      setProject(state);
      if (buffer?.path === fileMove.file.path) { const moved = await api.readFile(target); setBuffer({ path: moved.path, content: moved.content, savedContent: moved.content, diskHash: moved.hash, version: buffer.version + 1, state: 'saved' }); }
      setFileMove(null);
    } catch (error) { setFileMove((current) => current ? { ...current, error: errorMessage(error), submitting: false } : current); }
  };

  return (
    <div className={`app ${focusMode ? 'is-focus' : ''} ${view === 'git' ? 'is-git' : ''} ${rightOpen ? '' : 'is-right-closed'}`}>
      {browserPreview && <div className="web-preview-banner"><b>浏览器 UI 演示</b><span>使用内存示例，不读取仓库、不启动 Agent、不执行 Git</span></div>}
      <aside className="rail">
        <div className="brand-mark" title="叙舟 · 长篇写作工作台"><img src="./icon.svg" alt="叙舟" /></div>
        <nav>{NAVIGATION.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => selectNavigation(item.id)} title={item.label}><item.icon size={19} /><span>{item.label}</span></button>)}</nav>
      </aside>

      <aside className="project-sidebar">
        <div className="project-heading"><div><span className="eyebrow">{project.manifest.kind === 'series' ? '系列作品' : '长篇小说'}</span><h1>{project.manifest.title}</h1>{project.manifest.kind === 'series' && <div className="work-switcher"><Select value={project.manifest.activeWorkId} onChange={async (event) => { const state = await api.activateWork(event.target.value); setProject(state); if (state.continueCard.lastFile) await openFile(state.continueCard.lastFile); }}>{project.manifest.works.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}</Select><button title="添加系列作品" onClick={() => setNewWork({ title: '', error: '', submitting: false })}><Plus size={12} /></button></div>}</div><button className="icon-button" aria-label="作品与仓库" title="作品与仓库" onClick={() => void openProjectHub()}><Archive size={17} /></button></div>
        <div className="sidebar-search"><Search size={15} /><input aria-label="搜索正文、设定与计划" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'Escape') { setQuery(''); return; }
          if (event.key !== 'Enter' || event.nativeEvent.isComposing || searchPending || !searchResults[0]) return;
          event.preventDefault();
          void openFile(searchResults[0].path);
          setQuery('');
        }} placeholder="搜索正文、设定与计划…" />{query && <button aria-label="清除搜索" onClick={() => setQuery('')}><X size={13} /></button>}</div>
        {query && <div className="search-results" aria-live="polite">{searchPending ? <span className="search-pending"><LoaderCircle className="spin" size={14} />正在搜索…</span> : <>{searchResults.map((result, index) => <button key={`${result.path}:${result.line}`} onClick={() => { void openFile(result.path); setQuery(''); }}><b>{fileTitle(result.path)} · {result.line}</b><span>{result.excerpt}</span>{index === 0 && <small>回车打开</small>}</button>)}{searchResults.length === 0 && <span>没有找到匹配内容</span>}</>}</div>}
        <FileTree files={project.files} active={buffer?.path} works={project.manifest.works} onOpen={openFile} onCreate={createFile} onMove={moveProjectFile} onTrash={requestTrash} />
        <div className="sidebar-summary">
          <div><Target size={15} /><span>{project.continueCard.goal?.title || '等待确定当前目标'}</span></div>
          <button onClick={() => selectNavigation('tasks')}>{project.tasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled').length} 个待办 <ChevronRight size={14} /></button>
        </div>
      </aside>

      <main className="workspace">
        {view === 'continue' && <ContinuePanel project={project} onContinue={() => project.continueCard.lastFile && void openFile(project.continueCard.lastFile)} onWriter={() => openAgent('writer', project.continueCard.focus)} onStuck={() => openAgent('architect', `我在「${project.continueCard.location}」卡住了。先结合当前目标诊断卡文类型，再给多条剧情路线，不要直接改正文。`)} onObserver={toggleObserver} observerActive={observer.active} onView={(next) => { if (next === 'comments') { setRightOpen(true); setRightTab('comments'); } else selectNavigation(next); }} />}
        {view === 'journey' && <JourneyPanel project={project} onAgent={() => openAgent('navigator', `根据当前阶段「${project.continueCard.stage}」和作品现状，先做预分析，再给少量可比较的下一步路线。`)} onDecide={async (input) => { await api.decideProposal(input); await refresh(); }} />}
        {(view === 'editor' || view === 'planning') && <EditorWorkspace buffer={buffer} comments={contextualComments.filter((comment) => buffer && buffer.content.slice(comment.anchor.start, comment.anchor.end) === comment.anchor.quote)} files={project.files} preview={preview} focusMode={focusMode} readOnly={Boolean(activeWriter)} onOpen={openFile} onChange={updateContent} onSave={save} onAnalyze={analyze} onRecovery={() => setRecoveryOpen(true)} onTogglePreview={() => setPreview((value) => !value)} onToggleFocus={() => setFocusMode((value) => !value)} onCreateEditor={(editor) => { editorRef.current = editor; }} />}
        {view === 'review' && <ReviewPanel project={project} currentFile={buffer?.path} settings={settings} agents={agents} adapter={observerAdapter} onAdapter={changeObserverAdapter} onRun={async (filePath, reviewScope, reviewWindow, sourceWriterTaskId) => {
          const adapter = agents.find((item) => item.id === observerAdapter && item.available)?.id;
          if (!adapter) throw new Error('选定的审阅 Agent 当前不可用，请重新检测；不会自动切换到其他 CLI。');
          const current = bufferRef.current;
          const file = await api.readFile(filePath);
          const content = current?.path === filePath ? current.content : file.content;
          const snapshot: AnalysisSnapshot = { id: crypto.randomUUID(), filePath, content, hash: await sha256(content), editorVersion: current?.path === filePath ? current.version : 0, createdAt: new Date().toISOString() };
          await api.runObserver({ adapterId: adapter, mode: 'manual', snapshot, reviewScope, reviewWindow, sourceWriterTaskId });
          await refresh();
        }} onCancel={async (id) => { await api.cancelAgent(id); await refresh(); }} onOpen={(filePath) => { void openFile(filePath); setView('editor'); }} onComment={(comment) => { void openFile(comment.anchor.filePath); setView('editor'); setRightOpen(true); setRightTab('comments'); }} onSettings={async (patch) => setSettings(await api.updateSettings(patch))} onRefresh={refresh} />}
        {view === 'tasks' && <TasksPanel project={project} onRefresh={refresh} />}
        {view === 'story' && <StoryPanel project={project} buffer={buffer} onRefresh={refresh} />}
        {view === 'git' && <GitPanel project={project} onRefresh={refresh} />}
        {view === 'style' && <StylePanel project={project} onAgent={() => openAgent('memory-curator', '结合仓库中的作品风格、近期 Observer 评论和作者反馈，提炼重复出现的风格偏好、优势与待提升能力。只提出有多条证据支持的候选，不修改长期规则。')} />}
        {view === 'settings' && <SettingsPanel project={project} settings={settings} onChange={async (patch) => { const next = await api.updateSettings(patch); setSettings(next); }} onGitPolicy={async (policy) => setProject(await api.updateGitPolicy(policy))} agents={agents} repository={repository} onProjectHub={() => void openProjectHub()} />}
        {view === 'help' && <HelpPanel repository={repository} onNewProject={() => void openProjectHub('create')} onOpenProject={() => void chooseAndOpen()} onOpenGit={() => selectNavigation('git')} onOpenStyle={() => selectNavigation('style')} />}
        {(view === 'agents' || view === 'comments') && <EmptyCenter view={view} onBack={() => setView(buffer ? 'editor' : 'continue')} />}
      </main>

      <aside className="right-panel" style={{ display: rightOpen ? undefined : 'none' }}>
        <div className="right-tabs">
          <button ref={(element) => { rightTabRefs.current.comments = element; }} className={rightTab === 'comments' ? 'active' : ''} onClick={() => setRightTab('comments')}>评论 <span>{rightCommentCount}</span></button>
          <button ref={(element) => { rightTabRefs.current.agents = element; }} className={rightTab === 'agents' ? 'active' : ''} onClick={() => setRightTab('agents')}>Agent</button>
          <button ref={(element) => { rightTabRefs.current.context = element; }} className={rightTab === 'context' ? 'active' : ''} onClick={() => setRightTab('context')}>上下文</button>
          <button className="close-panel" onClick={() => setRightOpen(false)}><PanelRightClose size={16} /></button>
        </div>
        <div style={{ display: rightTab === 'comments' ? 'contents' : 'none' }}><CommentsPanel comments={contextualComments} running={observerRunning || project.agentTasks.some((task) => task.role === 'observer' && task.state === 'running')} canCancel={Boolean(observerTaskId)} canAnalyze={Boolean(buffer)} error={observerError} active={observer.active} count={observer.count} budget={observer.budget} agents={agents} adapter={observerAdapter} onAdapter={changeObserverAdapter} onToggle={toggleObserver} onAnalyze={() => void analyze('manual')} onCancel={() => void cancelObserver()} onSelect={(comment) => { const editor = editorRef.current; if (!editor || comment.status === 'stale') return; const length = editor.state.doc.length; const start = Math.min(length, comment.anchor.start); const end = Math.min(length, comment.anchor.end); if (editor.state.sliceDoc(start, end) !== comment.anchor.quote) return; editor.dispatch({ selection: { anchor: start, head: end }, scrollIntoView: true }); editor.focus(); }} onFeedback={async (comment, action, reason) => { if (['review', 'explain'].includes(action) && (observerRunning || project.agentTasks.some((task) => task.role === 'observer' && task.state === 'running'))) { setNotice({ kind: 'info', text: '已有审阅正在进行；本次检查尚未启动，请完成后重试。' }); return; } await api.commentFeedback({ commentId: comment.id, action, reason }); await refresh(); if (action === 'review') void analyze('review', comment.id); if (action === 'explain') void analyze('explain', comment.id); }} onSendWriter={async (comment) => {
          const writer = [...project.agentTasks].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).find((task) => task.role === 'writer' && task.sessionId && task.state !== 'running' && task.scope.some((scope) => comment.anchor.filePath === scope || comment.anchor.filePath.startsWith(`${scope.replace(/\/$/, '')}/`)));
          if (!writer) { setNotice({ kind: 'info', text: '没有覆盖当前文件且可续接的 Writer 会话。请先在 Agent 面板启动 Writer。' }); return; }
          try {
            await api.sendAgentMessage(writer.id, `Observer 提交了一个需要处理的写作问题，请在原授权范围内检查并处理。\n文件：${comment.anchor.filePath}\n原文：${comment.anchor.quote}\n问题：${comment.summary}\n依据：${comment.evidence}\n建议：${comment.suggestedAction}\n\n直接修改正文，或在无法安全修改时说明仍需作者决定的事项。不要执行 Git 写操作。`);
            await api.commentFeedback({ commentId: comment.id, action: 'forward', reason: `Writer 任务 ${writer.id}` });
            setRightTab('agents');
            await refresh();
          } catch (error) { setNotice({ kind: 'error', text: errorMessage(error) }); }
        }} /></div>
        <div style={{ display: rightTab === 'agents' ? 'contents' : 'none' }}><AgentsPanel project={project} agents={agents} events={agentEvents} buffer={buffer} contextPack={contextPack} preset={agentPreset} onContext={setContextPack} onShowContext={() => setRightTab('context')} onRefresh={refresh} onReloadAgents={async () => { const next = await api.listAgents(); setAgents(next); return next; }} /></div>
        <div style={{ display: rightTab === 'context' ? 'contents' : 'none' }}><ContextPanel pack={contextPack} onChange={setContextPack} onBuild={async () => { if (!buffer) return; const pack = await api.createContextPack({ task: contextPack?.task || project.continueCard.focus, filePath: buffer.path, content: buffer.content }); setContextPack(pack); }} /></div>
      </aside>
      {!rightOpen && <button className="open-right" onClick={() => setRightOpen(true)}><PanelRightOpen size={18} /></button>}

      <footer className="statusbar">
        <span className={`save-state state-${buffer?.state || 'saved'}`}>{buffer?.state === 'conflict' && <CircleAlert size={13} />}{buffer ? saveLabel[buffer.state] : '未打开文件'}</span>
        <span><GitBranch size={13} /> {project.git.branch} · {project.git.files.length ? `${project.git.files.length} 项变更` : '工作区干净'}</span>
        <button onClick={() => { setRightOpen(true); setRightTab('agents'); }}><Bot size={13} /> {project.agentTasks.some((task) => task.state === 'running') ? 'Agent 工作中' : 'Agent 空闲'}</button>
        <button className={observer.active ? 'observer-on' : ''} onClick={() => { setRightOpen(true); setRightTab('comments'); }}><Eye size={13} /> Observer {observer.active ? `已开启 · ${observer.count}/${observer.budget}` : '已关闭'}</button>
        <span className="status-spacer" />
        <span>全书 {project.manuscriptStats.totalCharacters.toLocaleString()} 字</span>
        <span>{buffer ? `${fileCharacterLabel(activeBufferFile?.category)} ${characters(buffer.content).toLocaleString()} 字` : ''}</span>
      </footer>

      {fileCreate && <Modal title={`新建${fileCreate.category === 'manuscript' ? '正文' : fileCreate.category === 'planning' ? '大纲与剧情' : fileCreate.category === 'research' ? '研究资料' : fileCreate.category === 'canon' ? '人物与世界' : '决定'}`} onClose={() => setFileCreate(null)}><form onSubmit={(event) => { event.preventDefault(); if (!fileCreate.submitting) void submitCreateFile(String(new FormData(event.currentTarget).get('path') || '')); }}><p className="modal-lead">输入仓库内的文件名或相对目录。默认沿用当前分卷；支持 Markdown 与 TXT，绝不会覆盖同名文件。</p><label>文件名或相对路径<input name="path" autoFocus value={fileCreate.name} onChange={(event) => setFileCreate({ ...fileCreate, name: event.target.value, error: '' })} placeholder="例如：第一卷/第002章-新的转折.md" /></label>{fileCreate.error && <p className="form-error">{fileCreate.error}</p>}<div className="modal-actions"><button type="button" onClick={() => setFileCreate(null)}>取消</button><button type="submit" className="primary" disabled={fileCreate.submitting}>{fileCreate.submitting ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />}{fileCreate.submitting ? '正在创建…' : '创建并打开'}</button></div></form></Modal>}
      {fileMove && <Modal title="移动或重命名文件" onClose={() => setFileMove(null)}><form onSubmit={(event) => { event.preventDefault(); if (!fileMove.submitting) void submitMoveFile(String(new FormData(event.currentTarget).get('path') || '')); }}><p className="modal-lead">目标是仓库内相对路径；不会覆盖同名文件。当前路径：{fileMove.file.path}</p><label>新路径<input name="path" autoFocus value={fileMove.target} onChange={(event) => setFileMove({ ...fileMove, target: event.target.value, error: '' })} /></label>{fileMove.error && <p className="form-error">{fileMove.error}</p>}<div className="modal-actions"><button type="button" onClick={() => setFileMove(null)}>取消</button><button type="submit" className="primary" disabled={fileMove.submitting}>{fileMove.submitting ? '正在移动…' : '确认移动'}</button></div></form></Modal>}
      {newWork && <Modal title="添加系列作品" onClose={() => setNewWork(null)}><form onSubmit={async (event) => { event.preventDefault(); const title = String(new FormData(event.currentTarget).get('title') || '').trim(); if (!title || newWork.submitting) { if (!title) setNewWork({ ...newWork, error: '请输入作品名。' }); return; } setNewWork({ ...newWork, title, error: '', submitting: true }); try { const state = await api.addWork(title); setProject(state); setNewWork(null); if (state.continueCard.lastFile) await openFile(state.continueCard.lastFile); } catch (error) { setNewWork((current) => current ? { ...current, error: errorMessage(error), submitting: false } : current); } }}><p className="modal-lead">新作品会加入当前系列仓库，拥有独立正文目录，并继续共享系列正典与作者规则。</p><label>作品名<input name="title" autoFocus value={newWork.title} onChange={(event) => setNewWork({ ...newWork, title: event.target.value, error: '' })} placeholder="例如：第二部 · 雨城回声" /></label>{newWork.error && <p className="form-error">{newWork.error}</p>}<div className="modal-actions"><button type="button" onClick={() => setNewWork(null)}>取消</button><button type="submit" className="primary" disabled={newWork.submitting}>{newWork.submitting ? '正在添加…' : '添加并切换'}</button></div></form></Modal>}
      {projectHub && <ProjectHubModal mode={projectHub} project={project} repository={repository} create={projectCreate} trashEntries={trashEntries} onMode={setProjectHub} onChangeCreate={setProjectCreate} onChooseRoot={() => void chooseNewProjectRoot()} onCreate={(value) => void createNewProject(value)} onOpen={async () => { setProjectHub(null); await chooseAndOpen(); }} onReveal={() => void api.revealProjectFolder()} onRestore={async (id) => { const state = await api.restoreTrash(id); setProject(state); setTrashEntries(await api.listTrash()); }} onTrashRepository={() => setRepositoryTrashOpen(true)} onClose={() => setProjectHub(null)} />}
      {trashTarget && <TrashDialog target={trashTarget} onClose={() => setTrashTarget(null)} onDone={(state) => { const current = bufferRef.current; if (current && (current.path === trashTarget.path || current.path.startsWith(`${trashTarget.path.replace(/\/$/, '')}/`))) setBuffer(null); setProject(state); setView('continue'); setTrashTarget(null); void api.listTrash().then(setTrashEntries); }} />}
      {repositoryTrashOpen && <RepositoryTrashDialog title={project.manifest.title} root={project.root} onClose={() => setRepositoryTrashOpen(false)} onConfirm={async (confirmation) => { await api.trashCurrentProject({ confirmation }); setRepositoryTrashOpen(false); setProjectHub(null); setProject(null); setBuffer(null); setView('continue'); }} />}
      {buffer?.conflict && <ConflictDialog buffer={buffer} onResolve={async (content) => { await api.createRecovery({ path: buffer.path, content: buffer.content, reason: 'before-conflict-resolution' }); const result = await api.writeFile({ path: buffer.path, content, expectedHash: buffer.conflict!.actualHash, reason: 'conflict-resolution' }); setBuffer({ ...buffer, content, savedContent: content, diskHash: result.hash, state: 'saved', conflict: undefined, version: buffer.version + 1 }); }} onUseDisk={() => { void api.updateBufferState({ path: buffer.path, dirty: false, hash: buffer.conflict!.actualHash, content: buffer.conflict!.diskContent }); setBuffer({ ...buffer, content: buffer.conflict!.diskContent, savedContent: buffer.conflict!.diskContent, diskHash: buffer.conflict!.actualHash, state: 'saved', conflict: undefined, version: buffer.version + 1 }); }} />}
      {buffer && recoveryOpen && <RecoveryDialog path={buffer.path} onClose={() => setRecoveryOpen(false)} onRestore={(content) => { void api.updateBufferState({ path: buffer.path, dirty: content !== buffer.savedContent, hash: buffer.diskHash, content }); setBuffer((current) => current ? { ...current, content, state: content === current.savedContent ? 'saved' : 'dirty', version: current.version + 1 } : current); setRecoveryOpen(false); }} />}
      {notice && <div className={`toast ${notice.kind}`}><span>{notice.text}</span><button onClick={() => setNotice(null)}><X size={15} /></button></div>}
    </div>
  );
}

function ProjectHubModal({ mode, project, repository, create, trashEntries, onMode, onChangeCreate, onChooseRoot, onCreate, onOpen, onReveal, onRestore, onTrashRepository, onClose }: {
  mode: 'home' | 'create'; project: ProjectState; repository: RepositoryInfo | null;
  create: { root: string; title: string; idea: string; targetWan: number; kind: 'novel' | 'series'; error: string; submitting: boolean };
  trashEntries: TrashEntry[]; onMode(mode: 'home' | 'create'): void; onChangeCreate(value: typeof create): void; onChooseRoot(): void; onCreate(value: Pick<typeof create, 'title' | 'idea' | 'targetWan' | 'kind'>): void; onOpen(): void; onReveal(): void; onRestore(id: string): Promise<void>; onTrashRepository(): void; onClose(): void;
}) {
  const [copied, setCopied] = useState(false);
  if (mode === 'create') return <Modal title="新建小说仓库" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onCreate({ title: String(data.get('title') || ''), idea: String(data.get('idea') || ''), targetWan: parseTargetWanDraft(String(data.get('targetWan') || '')), kind: create.kind }); }}><p className="modal-lead">选择空目录，工作台会创建 Git 仓库、第一章、正典、规划、研究区和初始任务。不会覆盖已有文件。</p><div className="segmented light"><button type="button" className={create.kind === 'novel' ? 'active' : ''} onClick={() => onChangeCreate({ ...create, kind: 'novel' })}>独立小说</button><button type="button" className={create.kind === 'series' ? 'active' : ''} onClick={() => onChangeCreate({ ...create, kind: 'series' })}>系列作品</button></div><label>作品名<input name="title" autoFocus value={create.title} onChange={(event) => onChangeCreate({ ...create, title: event.target.value, error: '' })} placeholder="可以先使用暂定名" /></label><label>一句灵感<textarea name="idea" value={create.idea} onChange={(event) => onChangeCreate({ ...create, idea: event.target.value, error: '' })} placeholder="没有也可以留空，之后让 Navigator 帮你探索" /></label><label>计划篇幅（万字）<input name="targetWan" type="number" min="5" max="1000" value={targetWanDraftValue(create.targetWan)} onChange={(event) => onChangeCreate({ ...create, targetWan: parseTargetWanDraft(event.target.value), error: '' })} onBlur={() => onChangeCreate({ ...create, targetWan: clampTargetWan(create.targetWan) })} /></label><label>仓库位置<div className="path-input light"><input readOnly value={create.root} placeholder="选择一个空目录" /><button type="button" onClick={onChooseRoot}>选择…</button></div></label>{create.error && <p className="form-error">{create.error}</p>}<div className="modal-actions"><button type="button" onClick={() => onMode('home')}>返回作品中心</button><button type="submit" className="primary" disabled={create.submitting}>{create.submitting ? '正在建立…' : '建立写作现场'}</button></div></form></Modal>;
  return <Modal title="作品与仓库" onClose={onClose}>
    <div className="repository-card"><div><span>当前作品</span><h4>{project.manifest.title}</h4></div><dl><div><dt>本地仓库</dt><dd><code>{repository?.root || project.root}</code></dd></div><div><dt>分支 / 版本</dt><dd>{repository?.branch || project.git.branch}{repository?.head ? ` · ${repository.head}` : ''}</dd></div><div><dt>远端地址</dt><dd>{repository?.remote || '未配置远端，仅保存在本机'}</dd></div><div><dt>工作区</dt><dd>{repository?.clean ? '干净' : `${repository?.changedFiles ?? project.git.files.length} 项未提交变更`}</dd></div></dl><div className="repository-actions"><button onClick={onReveal}><FolderOpen size={14} />在 Finder 中显示</button><button onClick={async () => { await navigator.clipboard.writeText(repository?.root || project.root); setCopied(true); setTimeout(() => setCopied(false), 1200); }}><Copy size={14} />{copied ? '已复制' : '复制路径'}</button></div></div>
    <div className="project-hub-actions"><button className="primary" onClick={() => onMode('create')}><Plus size={15} />新建小说</button><button onClick={onOpen}><Archive size={15} />打开其他仓库</button></div>
    <section className="trash-section"><header><div><span>工作台回收站</span><b>{trashEntries.length} 项</b></div><p>正文、大纲、研究、人物与世界、决定和系列作品都先移到仓库外回收站，不会立即永久删除。</p></header>
      {trashEntries.map((entry) => <article key={entry.id}><div><b>{entry.title}</b><span>{contentObjectLabel(entry.kind, entry.category)} · {entry.files} 个文件 · {entry.characters.toLocaleString()} 字</span></div><time>{new Date(entry.createdAt).toLocaleString()}</time><button onClick={() => void onRestore(entry.id)}>恢复到原位置</button></article>)}
      {!trashEntries.length && <p className="empty-copy">回收站为空。</p>}
    </section>
    <section className="repository-danger"><div><b>删除整个仓库</b><span>只会移入 macOS 废纸篓，但未推送的 Git 历史没有其他副本。</span></div><button onClick={onTrashRepository}><Trash2 size={14} />移到废纸篓…</button></section>
  </Modal>;
}

function TrashDialog({ target, onClose, onDone }: { target: { kind: TrashKind; path: string }; onClose(): void; onDone(state: ProjectState): void }) {
  const [impact, setImpact] = useState<TrashImpact | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { void window.workbench.analyzeTrash(target).then(setImpact).catch((cause) => setError(errorMessage(cause))); }, [target.kind, target.path]);
  const objectLabel = impact ? contentObjectLabel(impact.kind, impact.category) : '内容';
  return <Modal title={`删除${objectLabel}`} onClose={onClose}>{!impact && !error && <div className="modal-loading"><LoaderCircle className="spin" />正在分析删除影响…</div>}{impact && <><p className="warning-copy">{objectLabel}会移入仓库外的工作台回收站，Git 中显示为删除，但不会自动提交。恢复前请勿在原位置创建同名内容。</p><div className="delete-impact"><div><span>文件</span><b>{impact.files.length}</b></div><div><span>内容</span><b>{impact.characters.toLocaleString()} 字</b></div><div><span>相关事实</span><b>{impact.linkedFacts}</b></div><div><span>任务 / 评论</span><b>{impact.linkedTasks} / {impact.linkedComments}</b></div><div><span>Agent 历史</span><b>{impact.linkedAgents}</b></div></div>{impact.warnings.map((warning) => <p className="impact-warning" key={warning}><CircleAlert size={14} />{warning}</p>)}<details className="delete-file-list"><summary>查看将移走的 {impact.files.length} 个文件</summary>{impact.files.map((file) => <code key={file}>{file}</code>)}</details><label>输入 <b>{impact.title}</b> 确认<input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label></>}{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button onClick={onClose}>取消</button><button className="danger-confirm" disabled={!impact || confirmation !== impact.title || submitting} onClick={async () => { if (!impact) return; setSubmitting(true); setError(''); try { const result = await window.workbench.trashProjectItem({ ...target, confirmation }); onDone(result.state); } catch (cause) { setError(errorMessage(cause)); setSubmitting(false); } }}>{submitting ? '正在移入回收站…' : '移入回收站'}</button></div></Modal>;
}

function RepositoryTrashDialog({ title, root, onClose, onConfirm }: { title: string; root: string; onClose(): void; onConfirm(confirmation: string): Promise<void> }) {
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  return <Modal title="删除整个小说仓库" onClose={onClose}><p className="warning-copy">仓库将从 <code>{root}</code> 移入 macOS 废纸篓。平台不会永久清空废纸篓；但当前仓库没有远端时，本机是唯一 Git 历史副本。</p><label>输入作品名 <b>{title}</b> 确认<input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button onClick={onClose}>取消</button><button className="danger-confirm" disabled={confirmation !== title || submitting} onClick={async () => { setSubmitting(true); setError(''); try { await onConfirm(confirmation); } catch (cause) { setError(errorMessage(cause)); setSubmitting(false); } }}>{submitting ? '正在移动…' : '移到系统废纸篓'}</button></div></Modal>;
}

function Welcome({ onOpen, onCreated, notice }: { onOpen(): void; onCreated(state: ProjectState): void; notice: { kind: string; text: string } | null }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ root: '', title: '', idea: '', targetWan: 100, kind: 'novel' as 'novel' | 'series' });
  const [error, setError] = useState('');
  const chooseRoot = async () => { const root = await window.workbench.chooseProject(); if (root) setForm((value) => ({ ...value, root })); };
  const create = async (submitted?: Pick<typeof form, 'title' | 'idea' | 'targetWan' | 'kind'>) => {
    const value = submitted ? { ...form, ...submitted } : form;
    if (!value.root) { setError('请先选择仓库位置。'); return; }
    if (!value.title.trim()) { setError('请输入作品名。'); return; }
    if (!isValidTargetWan(value.targetWan)) { setError('计划篇幅必须在 5—1000 万字之间。'); return; }
    try { setError(''); onCreated(await window.workbench.createProject({ root: value.root, title: value.title.trim(), idea: value.idea.trim(), kind: value.kind, targetCharacters: clampTargetWan(value.targetWan) * 10_000 })); } catch (cause) { setError(errorMessage(cause)); }
  };
  return <div className="welcome">
    <div className="welcome-brand"><div className="brand-large"><img src="./icon.svg" alt="叙舟" /></div><div><span>叙舟 · 长篇写作工作台</span><h1>让故事继续生长</h1></div></div>
    <p className="welcome-lead">作品留在你的 Git 仓库里。Codex、Claude Code 等通用 Agent 负责规划、写作、审查和整理，你保留方向与最终决定。</p>
    {!creating ? <div className="welcome-actions"><button className="primary" onClick={onOpen}><BookOpen size={18} />打开小说仓库</button><button onClick={() => setCreating(true)}><Plus size={18} />从一句灵感开始</button></div> : <form className="create-card" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void create({ title: String(data.get('title') || ''), idea: String(data.get('idea') || ''), targetWan: parseTargetWanDraft(String(data.get('targetWan') || '')), kind: form.kind }); }}>
      <div className="segmented"><button type="button" className={form.kind === 'novel' ? 'active' : ''} onClick={() => setForm({ ...form, kind: 'novel' })}>独立小说</button><button type="button" className={form.kind === 'series' ? 'active' : ''} onClick={() => setForm({ ...form, kind: 'series' })}>系列作品</button></div>
      <label>作品名<input name="title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="先用暂定名也可以" /></label>
      <label>一句灵感<textarea name="idea" value={form.idea} onChange={(event) => setForm({ ...form, idea: event.target.value })} placeholder="例如：一个能看见他人死亡倒计时的外卖员，发现自己的数字每天都在增加。" /></label>
      <label>计划篇幅（万字）<input name="targetWan" type="number" min="5" max="1000" value={targetWanDraftValue(form.targetWan)} onChange={(event) => setForm({ ...form, targetWan: parseTargetWanDraft(event.target.value) })} onBlur={() => setForm({ ...form, targetWan: clampTargetWan(form.targetWan) })} /></label>
      <label>仓库位置<div className="path-input"><input value={form.root} readOnly placeholder="选择一个空目录或已有 Git 仓库" /><button type="button" onClick={chooseRoot}>选择</button></div></label>
      {(error || notice) && <p className="form-error">{error || notice?.text}</p>}
      <div className="modal-actions"><button type="button" onClick={() => setCreating(false)}>返回</button><button type="submit" className="primary"><WandSparkles size={17} />建立写作现场</button></div>
    </form>}
    <div className="welcome-points"><div><ShieldAlert /><b>作者控制</b><span>不自动提交、不把推断升级为正典</span></div><div><History /><b>可恢复</b><span>自动保存与仓库外恢复点互相独立</span></div><div><Bot /><b>Agent 原生</b><span>复用已登录通用 Agent，不保存 API Key</span></div></div>
  </div>;
}

type FileTreeEntry =
  | { kind: 'directory'; name: string; path: string; count: number; children: FileTreeEntry[] }
  | { kind: 'file'; name: string; file: ProjectFile };

interface MutableFileTreeDirectory {
  name: string;
  path: string;
  directories: Map<string, MutableFileTreeDirectory>;
  files: ProjectFile[];
}

function buildFileTree(files: ProjectFile[]) {
  const root: MutableFileTreeDirectory = { name: '', path: files[0]?.path.split('/')[0] ?? '', directories: new Map(), files: [] };
  for (const file of files) {
    const parts = file.path.split('/').slice(1);
    parts.pop();
    let directory = root;
    for (const name of parts) {
      let child = directory.directories.get(name);
      if (!child) {
        child = { name, path: [directory.path, name].filter(Boolean).join('/'), directories: new Map(), files: [] };
        directory.directories.set(name, child);
      }
      directory = child;
    }
    directory.files.push(file);
  }

  const finalize = (directory: MutableFileTreeDirectory): FileTreeEntry[] => {
    const children: FileTreeEntry[] = [
      ...[...directory.directories.values()].map((child) => {
        const nested = finalize(child);
        return { kind: 'directory' as const, name: child.name, path: child.path, count: nested.reduce((sum, item) => sum + (item.kind === 'file' ? 1 : item.count), 0), children: nested };
      }),
      ...directory.files.map((file) => ({ kind: 'file' as const, name: fileTitle(file.path), file }))
    ];
    return children.sort((left, right) => compareNaturalPath(left.name, right.name));
  };
  return finalize(root);
}

function fileAncestors(filePath?: string) {
  if (!filePath) return [];
  const parts = filePath.split('/').slice(0, -1);
  return parts.map((_, index) => parts.slice(0, index + 1).join('/')).slice(1);
}

const CONTENT_GROUPS: Array<{ key: ManagedContentCategory; label: string }> = [
  { key: 'manuscript', label: '正文' }, { key: 'planning', label: '大纲与剧情' }, { key: 'research', label: '研究资料' },
  { key: 'canon', label: '人物与世界' }, { key: 'decision', label: '已确认决定' }
];

function contentObjectLabel(kind: TrashKind, category?: ManagedContentCategory) {
  if (kind === 'work') return '系列作品';
  if (kind === 'directory' || kind === 'volume') return category === 'manuscript' ? '分卷或目录' : '目录';
  return category === 'manuscript' ? '章节' : category === 'planning' ? '大纲与剧情文件' : category === 'research' ? '研究资料' : category === 'canon' ? '人物与世界文件' : category === 'decision' ? '决定文件' : '内容文件';
}

function FileTreeEntries({ entries, category, active, depth, expanded, activeRow, onToggle, onOpen, onMove, onTrash, workByRoot }: { entries: FileTreeEntry[]; category: ManagedContentCategory; active?: string; depth: number; expanded: Set<string>; activeRow: React.RefObject<HTMLDivElement | null>; onToggle(path: string): void; onOpen(path: string): void; onMove(file: ProjectFile): void; onTrash(kind: TrashKind, path: string): void; workByRoot: Map<string, ProjectState['manifest']['works'][number]> }) {
  return entries.map((entry) => {
    if (entry.kind === 'directory') {
      const open = expanded.has(entry.path);
      const containsActive = Boolean(active && (active === entry.path || active.startsWith(`${entry.path}/`)));
      const work = workByRoot.get(entry.path);
      const deletable = !work || workByRoot.size > 1;
      const kind: TrashKind = work ? 'work' : 'directory';
      return <div className={`file-tree-directory ${containsActive ? 'contains-active' : ''}`} key={entry.path}>
        <div className="file-tree-folder-row"><button className="file-tree-folder" style={{ paddingLeft: `${7 + depth * 13}px` }} aria-expanded={open} onClick={() => onToggle(entry.path)} title={entry.path}>
          <ChevronRight className={open ? 'rotate' : ''} size={12} />{open ? <FolderOpen size={14} /> : <Folder size={14} />}<span>{entry.name}</span><small>{entry.count}</small>
        </button>{deletable && <button className="file-delete" title={`删除${contentObjectLabel(kind, category)} ${work?.title || entry.name}`} onClick={() => onTrash(kind, entry.path)}><Trash2 size={11} /></button>}</div>
        {open && <FileTreeEntries entries={entry.children} category={category} active={active} depth={depth + 1} expanded={expanded} activeRow={activeRow} onToggle={onToggle} onOpen={onOpen} onMove={onMove} onTrash={onTrash} workByRoot={workByRoot} />}
      </div>;
    }
    return <div className="file-tree-row" ref={active === entry.file.path ? activeRow : undefined} style={{ marginLeft: `${depth * 13}px` }} key={entry.file.path}>
      <button className={active === entry.file.path ? 'active' : ''} onClick={() => onOpen(entry.file.path)} title={entry.file.path}><FileText size={14} /><span>{entry.name}</span></button>
      <button className="file-move" title={`移动或重命名 ${entry.name}`} onClick={() => onMove(entry.file)}><Pencil size={11} /></button>
      <button className="file-delete" title={`删除${contentObjectLabel('file', category)} ${entry.name}`} onClick={() => onTrash('file', entry.file.path)}><Trash2 size={11} /></button>
    </div>;
  });
}

function FileTree({ files, active, works, onOpen, onCreate, onMove, onTrash }: { files: ProjectFile[]; active?: string; works: ProjectState['manifest']['works']; onOpen(path: string): void; onCreate(category: ProjectFile['category']): void; onMove(file: ProjectFile): void; onTrash(kind: TrashKind, path: string): void }) {
  const groups = useMemo(() => CONTENT_GROUPS.map((group) => {
    const items = files.filter((file) => file.category === group.key);
    return { ...group, items, tree: buildFileTree(items) };
  }), [files]);
  const workByRoot = useMemo(() => new Map(works.map((work) => [work.manuscriptRoot.replace(/\/$/, ''), work])), [works]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(fileAncestors(active)));
  const activeRow = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ancestors = fileAncestors(active);
    if (ancestors.length) setExpanded((current) => new Set([...current, ...ancestors]));
  }, [active]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => activeRow.current?.scrollIntoView({ block: 'nearest' }));
    return () => cancelAnimationFrame(frame);
  }, [active, expanded]);

  return <div className="file-tree">{groups.map((group) => {
    return <section key={group.key}><h3>{group.label}<span>{group.items.length}<button title={`新建${group.label}`} onClick={() => onCreate(group.key)}><Plus size={12} /></button></span></h3>{group.items.length ? <FileTreeEntries entries={group.tree} category={group.key} active={active} depth={0} expanded={expanded} activeRow={activeRow} onToggle={(path) => setExpanded((current) => { const next = new Set(current); if (next.has(path)) next.delete(path); else next.add(path); return next; })} onOpen={onOpen} onMove={onMove} onTrash={onTrash} workByRoot={workByRoot} /> : <p className="file-tree-empty">暂无{group.label}，可随时新建或从回收站恢复。</p>}</section>;
  })}</div>;
}

function ContinuePanel({ project, onContinue, onWriter, onStuck, onObserver, observerActive, onView }: { project: ProjectState; onContinue(): void; onWriter(): void; onStuck(): void; onObserver(): void; observerActive: boolean; onView(view: View): void }) {
  const card = project.continueCard;
  const stats = project.manuscriptStats;
  return <div className="page continue-page"><header><span className="eyebrow">欢迎回来 · {relativeTime(project.manifest.updatedAt)}</span><h2>{card.location}</h2><p>当前阶段：{card.stage}</p></header>
    <section className="manuscript-progress"><div><span>全书进度</span><b>{stats.totalCharacters.toLocaleString()} / {stats.targetCharacters.toLocaleString()} 字</b><small>{stats.chapterCount} 章 · {(stats.progress * 100).toFixed(1)}%</small></div><div className="manuscript-progress-track"><span style={{ width: `${Math.max(0.4, stats.progress * 100)}%` }} /></div></section>
    <details className="onboarding-guide" open={stats.chapterCount <= 1}><summary><span>新手引导</span><b>{stats.chapterCount <= 1 ? '按这四步开始第一章' : '随时查看工作台使用方法'}</b><ChevronRight size={15} /></summary><div><ol><li className="done"><Check size={14} /><span><b>作品仓库已建立</b>正文、正典和计划会一起保存。</span></li><li className={card.goal ? 'done' : ''}><Check size={14} /><span><b>确认故事方向</b>没有方向时去“创作旅程”让 AI 给候选。</span></li><li className={stats.totalCharacters > 50 ? 'done' : ''}><Check size={14} /><span><b>完成第一段正文</b>自己写，或把明确范围交给 Writer。</span></li><li className={project.comments.length ? 'done' : ''}><Check size={14} /><span><b>审查并建立版本</b>用右侧 Observer 评论，再到 Git 变更检查。</span></li></ol><button onClick={() => onView('help')}>打开完整使用指南</button></div></details>
    {project.dataWarnings.length > 0 && <details className="data-warning"><summary><CircleAlert size={15} />检测到 {project.dataWarnings.length} 条项目记录异常，未覆盖原数据</summary><p>有效记录已继续加载。请先保留当前 Git 状态，再从历史版本恢复损坏行或使用迁移工具。</p>{project.dataWarnings.map((warning) => <code key={warning}>{warning}</code>)}</details>}
    <section className="continue-card"><div className="goal-kicker"><Target size={17} />当前创作目标</div><h3>{card.goal?.title || '还没有固定目标'}</h3><p>{card.goal?.description || '让创作导航器读取现状并提出下一步。'}</p><div className="focus-line"><span>本次焦点</span><b>{card.focus}</b></div><div className="continue-actions"><button className="primary" onClick={onContinue}><Play size={17} />继续写作</button><button onClick={onWriter}><Bot size={17} />交给 Writer</button><button onClick={onStuck}><Lightbulb size={17} />我卡住了</button><button className={observerActive ? 'active-control' : ''} onClick={onObserver}>{observerActive ? <EyeOff size={17} /> : <Eye size={17} />}{observerActive ? '关闭 Observer' : '启动 Observer'}</button></div></section>
    <div className="dashboard-grid"><section><div className="section-title"><ListTodo size={17} /><h3>接下来</h3><button onClick={() => onView('tasks')}>完整计划</button></div>{card.next.length ? card.next.map((task, index) => <div className="next-row" key={task.id}><span>{index + 1}</span><div><b>{task.title}</b><small>{task.whyNow}</small></div></div>) : <p className="empty-copy">暂无下一步，建议启动 Navigator。</p>}</section><section><div className="section-title"><CircleAlert size={17} /><h3>真正的阻塞</h3></div>{card.blockers.length ? card.blockers.map((task) => <div className="blocker" key={task.id}>{task.title}</div>) : <div className="all-clear"><Check size={20} />没有阻塞，可以继续写</div>}<div className="section-title comments-title"><MessageSquareText size={17} /><h3>重要评论</h3><button onClick={() => onView('comments')}>{card.importantComments.length} 条</button></div>{card.importantComments.slice(0, 2).map((comment) => <p className="important-comment" key={comment.id}>{comment.summary}</p>)}</section></div>
  </div>;
}

function LegacyJourneyPanel({ project, onAgent, onDecide }: { project: ProjectState; onAgent(): void; onDecide(input: { proposalId: string; routeId?: string; routeIds?: string[]; combinationNote?: string; decision: 'confirm' | 'reject' }): Promise<void> }) {
  const current = Math.max(0, JOURNEY.findIndex((stage) => project.continueCard.stage.includes(stage) || stage.includes(project.continueCard.stage)));
  const proposals = [...project.proposals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [combined, setCombined] = useState<Record<string, string[]>>({});
  const [combining, setCombining] = useState<{ proposalId: string; routeIds: string[]; note: string; error: string; submitting: boolean } | null>(null);
  return <div className="page journey-page"><header><span className="eyebrow">智能创作导航</span><h2>从灵感到完结，不用一次想完</h2><p>默认采用陪跑 + 滚动规划：保留全书方向，细化当前卷与未来一至三章。</p></header><div className="journey-list">{JOURNEY.map((stage, index) => <div className={`journey-step ${index < current ? 'done' : index === current ? 'current' : ''}`} key={stage}><div className="step-index">{index < current ? <Check size={16} /> : index + 1}</div><div><b>{stage}</b><span>{index === current ? project.continueCard.focus : index < current ? '已有作品证据或计划' : '将在需要时展开，不阻塞当前写作'}</span></div>{index === current && <button onClick={onAgent}>让 AI 先给方案</button>}</div>)}</div>{proposals.length > 0 && <section className="proposal-section"><div className="section-title"><Compass size={18} /><h3>AI 路线候选</h3></div>{proposals.map((proposal) => <article className={`proposal-card proposal-${proposal.status}`} key={proposal.id}><div className="proposal-head"><div><span>{proposal.kind === 'opening' ? '开书候选' : proposal.kind === 'routes' ? '卡文推演' : '下一步建议'}</span><h3>{proposal.title}</h3></div><b>{proposal.status === 'pending' ? '待作者决定' : proposal.status === 'confirmed' ? '已确认' : '已拒绝'}</b></div><p>{proposal.diagnosis}</p>{proposal.highImpactQuestions.length > 0 && <details><summary>仍需考虑的高影响问题</summary><ul>{proposal.highImpactQuestions.map((question) => <li key={question}>{question}</li>)}</ul></details>}<div className="route-grid">{proposal.routes.map((route) => <section className={proposal.selectedRouteId === route.id ? 'selected' : ''} key={route.id}><h4>{route.title}</h4><p>{route.pitch}</p><dl><div><dt>预期效果</dt><dd>{route.effect}</dd></div><div><dt>因果链</dt><dd>{route.causalChain.join(' → ')}</dd></div><div><dt>代价</dt><dd>{route.tradeoffs.join('；') || '无明显代价'}</dd></div><div><dt>风险</dt><dd>{route.risks.join('；') || '暂无'}</dd></div><div><dt>后续影响</dt><dd>{route.followUpImpact}</dd></div><div><dt>新增铺垫</dt><dd>{route.requiredSetup.join('；') || '无需新增'}</dd></div></dl>{proposal.status === 'pending' && <><label className="combine-route"><input type="checkbox" checked={(combined[proposal.id] || []).includes(route.id)} onChange={(event) => setCombined((value) => ({ ...value, [proposal.id]: event.target.checked ? [...(value[proposal.id] || []), route.id] : (value[proposal.id] || []).filter((id) => id !== route.id) }))} />加入组合</label><button className="primary" onClick={() => void onDecide({ proposalId: proposal.id, routeId: route.id, decision: 'confirm' })}>选用这条路线</button></>}</section>)}</div>{proposal.status === 'pending' && <div className="proposal-actions"><button disabled={(combined[proposal.id] || []).length < 2} onClick={() => { const routeIds = combined[proposal.id] || []; const combinationNote = prompt('说明如何组合与取舍（例如：以路线 A 的行动为主，使用路线 B 的揭示方式）')?.trim(); if (combinationNote) void onDecide({ proposalId: proposal.id, routeIds, combinationNote, decision: 'confirm' }); }}>组合已选路线</button><button onClick={onAgent}>重新推演</button><button onClick={() => void onDecide({ proposalId: proposal.id, decision: 'reject' })}>都不采用</button></div>}</article>)}</section>}</div>;
}

function JourneyPanel({ project, onAgent, onDecide }: { project: ProjectState; onAgent(): void; onDecide(input: { proposalId: string; routeId?: string; routeIds?: string[]; combinationNote?: string; decision: 'confirm' | 'reject' }): Promise<void> }) {
  const current = Math.max(0, JOURNEY.findIndex((stage) => project.continueCard.stage.includes(stage) || stage.includes(project.continueCard.stage)));
  const proposals = [...project.proposals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [combined, setCombined] = useState<Record<string, string[]>>({});
  const [combining, setCombining] = useState<{ proposalId: string; routeIds: string[]; note: string; error: string; submitting: boolean } | null>(null);
  const submitCombination = async (submittedNote?: string) => {
    if (!combining || combining.submitting) return;
    const note = (submittedNote ?? combining.note).trim();
    if (!note) { setCombining({ ...combining, error: '请说明组合方式和取舍。' }); return; }
    setCombining({ ...combining, note, error: '', submitting: true });
    try {
      await onDecide({ proposalId: combining.proposalId, routeIds: combining.routeIds, combinationNote: note, decision: 'confirm' });
      setCombining(null);
    } catch (error) { setCombining((value) => value ? { ...value, error: errorMessage(error), submitting: false } : value); }
  };
  return <div className="page journey-page">
    <header><span className="eyebrow">智能创作导航</span><h2>从灵感到完结，不用一次想完</h2><p>默认采用陪跑 + 滚动规划：保留全书方向，细化当前卷与未来一至三章。</p></header>
    <div className="journey-list">{JOURNEY.map((stage, index) => <div className={`journey-step ${index < current ? 'done' : index === current ? 'current' : ''}`} key={stage}><div className="step-index">{index < current ? <Check size={16} /> : index + 1}</div><div><b>{stage}</b><span>{index === current ? project.continueCard.focus : index < current ? '已有作品证据或计划' : '将在需要时展开，不阻塞当前写作'}</span></div>{index === current && <button onClick={onAgent}>让 AI 先给方案</button>}</div>)}</div>
    {proposals.length > 0 && <section className="proposal-section"><div className="section-title"><Compass size={18} /><h3>AI 路线候选</h3></div>{proposals.map((proposal) => <article className={`proposal-card proposal-${proposal.status}`} key={proposal.id}>
      <div className="proposal-head"><div><span>{proposal.kind === 'opening' ? '开书候选' : proposal.kind === 'routes' ? '卡文推演' : '下一步建议'}</span><h3>{proposal.title}</h3></div><b>{proposal.status === 'pending' ? '待作者决定' : proposal.status === 'confirmed' ? '已确认' : '已拒绝'}</b></div>
      <p>{proposal.diagnosis}</p>
      {proposal.highImpactQuestions.length > 0 && <details><summary>仍需考虑的高影响问题</summary><ul>{proposal.highImpactQuestions.map((question) => <li key={question}>{question}</li>)}</ul></details>}
      <div className="route-grid">{proposal.routes.map((route) => <section className={proposal.selectedRouteId === route.id ? 'selected' : ''} key={route.id}><h4>{route.title}</h4><p>{route.pitch}</p><dl><div><dt>预期效果</dt><dd>{route.effect}</dd></div><div><dt>因果链</dt><dd>{route.causalChain.join(' → ')}</dd></div><div><dt>代价</dt><dd>{route.tradeoffs.join('；') || '无明显代价'}</dd></div><div><dt>风险</dt><dd>{route.risks.join('；') || '暂无'}</dd></div><div><dt>后续影响</dt><dd>{route.followUpImpact}</dd></div><div><dt>新增铺垫</dt><dd>{route.requiredSetup.join('；') || '无需新增'}</dd></div></dl>{proposal.status === 'pending' && <><label className="combine-route"><input type="checkbox" checked={(combined[proposal.id] || []).includes(route.id)} onChange={(event) => setCombined((value) => ({ ...value, [proposal.id]: event.target.checked ? [...(value[proposal.id] || []), route.id] : (value[proposal.id] || []).filter((id) => id !== route.id) }))} />加入组合</label><button className="primary" onClick={() => void onDecide({ proposalId: proposal.id, routeId: route.id, decision: 'confirm' })}>选用这条路线</button></>}</section>)}</div>
      {proposal.status === 'pending' && <div className="proposal-actions"><button disabled={(combined[proposal.id] || []).length < 2} onClick={() => setCombining({ proposalId: proposal.id, routeIds: combined[proposal.id] || [], note: '', error: '', submitting: false })}>组合已选路线</button><button onClick={onAgent}>重新推演</button><button onClick={() => void onDecide({ proposalId: proposal.id, decision: 'reject' })}>都不采用</button></div>}
    </article>)}</section>}
    {combining && <Modal title="组合剧情路线" onClose={() => setCombining(null)}><form onSubmit={(event) => { event.preventDefault(); void submitCombination(String(new FormData(event.currentTarget).get('note') || '')); }}><p className="modal-lead">说明哪条路线负责主要行动、哪条路线提供揭示方式，以及你愿意承担的取舍。只有确认后的组合会更新正式任务。</p><label>组合与取舍<textarea name="note" autoFocus value={combining.note} onChange={(event) => setCombining({ ...combining, note: event.target.value, error: '' })} placeholder="例如：以路线 A 的行动为主，采用路线 B 的揭示方式；保留 A 的失败代价。" /></label>{combining.error && <p className="form-error">{combining.error}</p>}<div className="modal-actions"><button type="button" onClick={() => setCombining(null)}>取消</button><button type="submit" className="primary" disabled={combining.submitting}>{combining.submitting ? '正在确认…' : '确认组合路线'}</button></div></form></Modal>}
  </div>;
}

function EditorWorkspace(props: { buffer: BufferState | null; comments: ObserverComment[]; files: ProjectFile[]; preview: boolean; focusMode: boolean; readOnly: boolean; onOpen(path: string): void; onChange(value: string): void; onSave(): void; onAnalyze(mode: 'manual' | 'selection'): void; onRecovery(): void; onTogglePreview(): void; onToggleFocus(): void; onCreateEditor(view: EditorView): void }) {
  if (!props.buffer) return <div className="empty-editor"><BookOpen size={32} /><h2>选择一章开始写作</h2><div>{props.files.filter((file) => file.category === 'manuscript').map((file) => <button key={file.path} onClick={() => props.onOpen(file.path)}>{fileTitle(file.path)}</button>)}</div></div>;
  return <div className="editor-page"><div className="editor-topbar"><div className="editor-document-heading"><span className="eyebrow">{props.buffer.path}</span><h2>{fileTitle(props.buffer.path)}</h2></div><div className="editor-tools" role="toolbar" aria-label="正文工具">
    <button className="save-tool" title="保存 (Command+S)" aria-label="保存" onClick={props.onSave} disabled={props.buffer.state !== 'dirty'}><Save size={15} /><span className="tool-label">保存</span></button>
    <button title="恢复历史版本" aria-label="恢复历史版本" onClick={props.onRecovery}><History size={15} /><span className="tool-label">恢复版本</span></button>
    <span className="editor-tool-divider" />
    <button title="请 Observer 检查选中文字" aria-label="检查选中文字" onClick={() => props.onAnalyze('selection')}><MessageSquareText size={15} /><span className="tool-label">检查选中</span></button>
    <button title="请 Observer 检查当前正文" aria-label="立即检查当前正文" onClick={() => props.onAnalyze('manual')}><Eye size={15} /><span className="tool-label">立即检查</span></button>
    <span className="editor-tool-divider" />
    <button title="切换 Markdown 预览" aria-label="切换 Markdown 预览" className={props.preview ? 'active' : ''} onClick={props.onTogglePreview}><Columns2 size={15} /><span className="tool-label">预览</span></button>
    <button title="切换专注写作" aria-label="切换专注写作" className={props.focusMode ? 'active' : ''} onClick={props.onToggleFocus}><Maximize2 size={15} /><span className="tool-label">专注</span></button>
  </div></div>{props.readOnly && <div className="agent-lock"><Bot size={15} />Writer 正在修改这个范围。停止任务后即可接管。</div>}<div className={`editor-stage ${props.preview ? 'split-preview' : ''}`}><Editor key={props.buffer.path} value={props.buffer.content} comments={props.comments} readOnly={props.readOnly} focusMode={props.focusMode} onChange={props.onChange} onBlur={() => {}} onCreate={props.onCreateEditor} />{props.preview && <MarkdownPreview content={props.buffer.content} />}</div></div>;
}

function LegacyTasksPanel({ project, onRefresh }: { project: ProjectState; onRefresh(): Promise<void> }) {
  const [adding, setAdding] = useState(false); const [title, setTitle] = useState('');
  const columns: Array<{ key: CreativeTask['status']; label: string }> = [{ key: 'now', label: '现在' }, { key: 'next', label: '下一步' }, { key: 'blocked', label: '阻塞' }, { key: 'completed', label: '已完成' }];
  return <div className="page tasks-page"><header className="page-header-row"><div><span className="eyebrow">目标与待办</span><h2>只把真正影响写作的事摆在眼前</h2></div><button className="primary" onClick={() => setAdding(true)}><Plus size={16} />新任务</button></header><div className="goal-banner"><Target size={20} /><div><span>当前目标</span><b>{project.continueCard.goal?.title || '未设置'}</b><p>{project.continueCard.goal?.description}</p></div></div><div className="task-board">{columns.map((column) => <section key={column.key}><h3>{column.label}<span>{project.tasks.filter((item) => item.status === column.key).length}</span></h3>{project.tasks.filter((item) => item.status === column.key).map((task) => <article className={`task-card priority-${task.priority}`} key={task.id}><div className="task-meta"><span>{task.kind}</span><span>{task.assignee}</span></div><b>{task.title}</b><p>{task.whyNow || task.description}</p><small>完成：{task.completionCriteria.join('；') || '待补充'}</small><div className="task-actions">{column.key !== 'completed' && <button onClick={async () => { await window.workbench.updateTask({ id: task.id, status: 'completed' }); await onRefresh(); }}><Check size={14} />完成</button>}{column.key === 'blocked' && <button onClick={async () => { await window.workbench.updateTask({ id: task.id, status: 'now' }); await onRefresh(); }}>解除阻塞</button>}</div></article>)}</section>)}</div>{adding && <Modal title="新建创作任务" onClose={() => setAdding(false)}><label>任务名称<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} /></label><div className="modal-actions"><button onClick={() => setAdding(false)}>取消</button><button className="primary" disabled={!title.trim()} onClick={async () => { await window.workbench.updateTask({ title, status: 'next', source: 'author' }); setAdding(false); setTitle(''); await onRefresh(); }}>创建</button></div></Modal>}</div>;
}

function TasksPanel({ project, onRefresh }: { project: ProjectState; onRefresh(): Promise<void> }) {
  type TaskDraft = { id?: string; title: string; description: string; level: CreativeTask['level']; status: CreativeTask['status']; kind: CreativeTask['kind']; assignee: CreativeTask['assignee']; priority: CreativeTask['priority']; whyNow: string; completionCriteria: string; links: string; cancellationReason: string };
  const emptyDraft = (): TaskDraft => ({ title: '', description: '', level: 'work', status: 'next', kind: 'writing', assignee: 'author', priority: 'normal', whyNow: '', completionCriteria: '', links: '', cancellationReason: '' });
  const [editing, setEditing] = useState<TaskDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const columns: Array<{ key: 'now' | 'next' | 'blocked' | 'terminal'; label: string }> = [{ key: 'now', label: '现在' }, { key: 'next', label: '下一步' }, { key: 'blocked', label: '阻塞' }, { key: 'terminal', label: '已结束' }];
  const tasksFor = (key: typeof columns[number]['key']) => key === 'terminal' ? project.tasks.filter((item) => ['completed', 'cancelled'].includes(item.status)) : project.tasks.filter((item) => item.status === key);
  const beginEdit = (task: CreativeTask) => setEditing({ id: task.id, title: task.title, description: task.description, level: task.level, status: task.status, kind: task.kind, assignee: task.assignee, priority: task.priority, whyNow: task.whyNow, completionCriteria: task.completionCriteria.join('\n'), links: task.links.join('\n'), cancellationReason: task.cancellationReason || '' });
  const submit = async (submitted?: TaskDraft) => {
    const value = submitted || editing;
    if (!value || saving) return;
    if (!value.title.trim()) { setError('任务名称不能为空。'); return; }
    if (value.status === 'cancelled' && !value.cancellationReason.trim()) { setError('取消任务时需要说明原因，避免未来误以为任务已经完成。'); return; }
    setSaving(true); setError('');
    try {
      await window.workbench.updateTask({ id: value.id, title: value.title.trim(), description: value.description.trim(), level: value.level, status: value.status, kind: value.kind, assignee: value.assignee, source: 'author', priority: value.priority, whyNow: value.whyNow.trim(), completionCriteria: value.completionCriteria.split('\n').map((item) => item.trim()).filter(Boolean), links: value.links.split('\n').map((item) => item.trim()).filter(Boolean), cancellationReason: value.status === 'cancelled' ? value.cancellationReason.trim() : undefined });
      setEditing(null); await onRefresh();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  };
  return <div className="page tasks-page">
    <header className="page-header-row"><div><span className="eyebrow">目标与待办</span><h2>只把真正影响写作的事摆在眼前</h2></div><button className="primary" onClick={() => { setError(''); setEditing(emptyDraft()); }}><Plus size={16} />新任务</button></header>
    <div className="goal-banner"><Target size={20} /><div><span>当前目标</span><b>{project.continueCard.goal?.title || '未设置'}</b><p>{project.continueCard.goal?.description}</p></div></div>
    <div className="task-board">{columns.map((column) => <section key={column.key}><h3>{column.label}<span>{tasksFor(column.key).length}</span></h3>{tasksFor(column.key).map((task) => <article className={`task-card priority-${task.priority}`} key={task.id}><div className="task-meta"><span>{task.level} · {task.kind}</span><span>{task.assignee}</span></div><b>{task.title}</b><p>{task.whyNow || task.description || '尚未补充任务说明'}</p><small>{task.status === 'cancelled' ? `取消：${task.cancellationReason || '未记录原因'}` : `完成：${task.completionCriteria.join('；') || '待补充'}`}</small><div className="task-actions"><button onClick={() => { setError(''); beginEdit(task); }}><Pencil size={12} />编辑</button>{!['completed', 'cancelled'].includes(task.status) && <button onClick={async () => { await window.workbench.updateTask({ id: task.id, status: 'completed' }); await onRefresh(); }}><Check size={14} />完成</button>}{task.status === 'blocked' && <button onClick={async () => { await window.workbench.updateTask({ id: task.id, status: 'now' }); await onRefresh(); }}>解除阻塞</button>}</div></article>)}</section>)}</div>
    {editing && <Modal title={editing.id ? '编辑创作任务' : '新建创作任务'} onClose={() => setEditing(null)}><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void submit({ ...editing, title: String(data.get('title') || ''), description: String(data.get('description') || ''), level: String(data.get('level') || editing.level) as CreativeTask['level'], status: String(data.get('status') || editing.status) as CreativeTask['status'], kind: String(data.get('kind') || editing.kind) as CreativeTask['kind'], assignee: String(data.get('assignee') || editing.assignee) as CreativeTask['assignee'], priority: String(data.get('priority') || editing.priority) as CreativeTask['priority'], whyNow: String(data.get('whyNow') || ''), completionCriteria: String(data.get('completionCriteria') || ''), links: String(data.get('links') || ''), cancellationReason: String(data.get('cancellationReason') || '') }); }}><label>任务名称<input name="title" autoFocus value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} /></label><label>任务说明<textarea name="description" value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} placeholder="要完成什么，以及明确不做什么" /></label><div className="task-form-grid"><label>层级<Select name="level" value={editing.level} onChange={(event) => setEditing({ ...editing, level: event.target.value as CreativeTask['level'] })}><option value="series">系列</option><option value="work">作品</option><option value="volume">卷</option><option value="chapter">章</option><option value="scene">场景</option><option value="session">会话</option></Select></label><label>类型<Select name="kind" value={editing.kind} onChange={(event) => setEditing({ ...editing, kind: event.target.value as CreativeTask['kind'] })}><option value="writing">写作</option><option value="canon">设定</option><option value="research">考据</option><option value="revision">修订</option><option value="review">审校</option><option value="release">发布准备</option></Select></label><label>状态<Select name="status" value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as CreativeTask['status'] })}><option value="now">现在</option><option value="next">下一步</option><option value="blocked">阻塞</option><option value="completed">已完成</option><option value="cancelled">已取消</option></Select></label><label>优先级<Select name="priority" value={editing.priority} onChange={(event) => setEditing({ ...editing, priority: event.target.value as CreativeTask['priority'] })}><option value="low">低</option><option value="normal">普通</option><option value="high">高</option><option value="critical">关键</option></Select></label><label>执行者<Select name="assignee" value={editing.assignee} onChange={(event) => setEditing({ ...editing, assignee: event.target.value as CreativeTask['assignee'] })}><option value="author">作者</option><option value="writer">Writer</option><option value="navigator">Navigator</option><option value="architect">Story Architect</option><option value="editor">Editor</option><option value="canon-keeper">Canon Keeper</option><option value="researcher">Researcher</option><option value="release-assistant">Release Assistant</option></Select></label></div><label>为什么现在做<input name="whyNow" value={editing.whyNow} onChange={(event) => setEditing({ ...editing, whyNow: event.target.value })} /></label><label>完成条件（每行一条）<textarea name="completionCriteria" value={editing.completionCriteria} onChange={(event) => setEditing({ ...editing, completionCriteria: event.target.value })} /></label><label>关联文件（每行一个仓库相对路径）<textarea name="links" value={editing.links} onChange={(event) => setEditing({ ...editing, links: event.target.value })} /></label>{editing.status === 'cancelled' && <label>取消原因<textarea name="cancellationReason" value={editing.cancellationReason} onChange={(event) => setEditing({ ...editing, cancellationReason: event.target.value })} /></label>}{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" onClick={() => setEditing(null)}>取消</button><button type="submit" className="primary" disabled={saving}>{saving ? '正在保存…' : editing.id ? '保存任务' : '创建任务'}</button></div></form></Modal>}
  </div>;
}

function LegacyStoryPanel({ project, onRefresh }: { project: ProjectState; onRefresh(): Promise<void> }) {
  const [adding, setAdding] = useState(false); const [fact, setFact] = useState({ subject: '', statement: '', category: 'character' as StoryFact['category'] });
  const groups: Array<{ key: StoryFact['category']; label: string }> = [{ key: 'character', label: '人物状态' }, { key: 'relationship', label: '关系' }, { key: 'timeline', label: '时间线' }, { key: 'knowledge', label: '知识边界' }, { key: 'foreshadowing', label: '伏笔' }, { key: 'world-rule', label: '世界规则' }, { key: 'promise', label: '叙事承诺' }];
  return <div className="page story-page"><header className="page-header-row"><div><span className="eyebrow">最小故事记忆</span><h2>事实有来源，推断不冒充正典</h2></div><button className="primary" onClick={() => setAdding(true)}><Plus size={16} />记录事实</button></header><div className="fact-grid">{groups.map((group) => <section key={group.key}><h3>{group.label}<span>{project.facts.filter((item) => item.category === group.key).length}</span></h3>{project.facts.filter((item) => item.category === group.key).map((item) => <article key={item.id}><div><b>{item.subject}</b><span className={`fact-status status-${item.status}`}>{item.status}</span></div><p>{item.statement}</p><small>{item.evidence[0] ? `来源：${item.evidence[0].filePath}` : '尚无正文证据'}</small></article>)}{!project.facts.some((item) => item.category === group.key) && <p className="empty-copy">暂无条目</p>}</section>)}</div>{adding && <Modal title="记录故事事实" onClose={() => setAdding(false)}><label>类型<Select value={fact.category} onChange={(event) => setFact({ ...fact, category: event.target.value as StoryFact['category'] })}>{groups.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</Select></label><label>主体<input value={fact.subject} onChange={(event) => setFact({ ...fact, subject: event.target.value })} placeholder="人物、地点或事件" /></label><label>事实陈述<textarea value={fact.statement} onChange={(event) => setFact({ ...fact, statement: event.target.value })} /></label><div className="modal-actions"><button onClick={() => setAdding(false)}>取消</button><button className="primary" disabled={!fact.subject || !fact.statement} onClick={async () => { await window.workbench.appendEvent('fact.upsert', { ...fact, id: crypto.randomUUID(), status: 'author-confirmed', evidence: [], updatedAt: new Date().toISOString() }, 'author'); setAdding(false); await onRefresh(); }}>确认为作者事实</button></div></Modal>}</div>;
}

function StoryPanel({ project, buffer, onRefresh }: { project: ProjectState; buffer: BufferState | null; onRefresh(): Promise<void> }) {
  const groups: Array<{ key: StoryFact['category']; label: string }> = [{ key: 'character', label: '人物状态' }, { key: 'relationship', label: '关系' }, { key: 'timeline', label: '时间线' }, { key: 'knowledge', label: '知识边界' }, { key: 'foreshadowing', label: '伏笔' }, { key: 'world-rule', label: '世界规则' }, { key: 'promise', label: '叙事承诺' }];
  const statusLabels: Record<StoryFact['status'], string> = { 'author-confirmed': '作者确认', 'text-explicit': '正文明确', 'agent-inferred': 'Agent 推断', 'ai-suggested': 'AI 建议', conflict: '存在冲突', deprecated: '已废弃' };
  const [adding, setAdding] = useState(false);
  const [fact, setFact] = useState({ subject: '', statement: '', category: 'character' as StoryFact['category'] });
  const [factEvidence, setFactEvidence] = useState({ filePath: '', quote: '' });
  const [factError, setFactError] = useState('');
  const [factQuery, setFactQuery] = useState('');
  const [factLimits, setFactLimits] = useState<Partial<Record<StoryFact['category'], number>>>({});
  const [editing, setEditing] = useState<StoryFact | null>(null);
  const [factAction, setFactAction] = useState<'edit' | 'deprecate' | 'restore'>('edit');
  const [draft, setDraft] = useState({ subject: '', statement: '', category: 'character' as StoryFact['category'] });
  const [impact, setImpact] = useState<CanonImpactAnalysis | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [intentionalRetcon, setIntentionalRetcon] = useState(false);
  const [createRevisionTask, setCreateRevisionTask] = useState(true);
  const [changeReason, setChangeReason] = useState('');
  const [editError, setEditError] = useState('');
  const factsForGroup = (category: StoryFact['category']) => {
    const query = factQuery.trim().toLocaleLowerCase('zh-CN');
    return project.facts.filter((item) => item.category === category && (!query || `${item.subject}\n${item.statement}\n${item.evidence.map((evidence) => evidence.filePath).join('\n')}`.toLocaleLowerCase('zh-CN').includes(query)));
  };
  const updateDraft = (patch: Partial<typeof draft>) => { setDraft((current) => ({ ...current, ...patch })); setImpact(null); setEditError(''); };
  const beginAdd = () => { setFactEvidence({ filePath: buffer?.path || '', quote: '' }); setFactError(''); setAdding(true); };
  const addFact = async (submitted?: { subject: string; statement: string; category: StoryFact['category']; filePath: string; quote: string }) => {
    setFactError('');
    const candidate = submitted || { ...fact, ...factEvidence };
    const subject = candidate.subject.trim();
    const statement = candidate.statement.trim();
    const filePath = candidate.filePath.trim();
    const quote = candidate.quote.trim();
    if (!subject || !statement) { setFactError('主体和事实陈述不能为空。'); return; }
    try {
      const evidence: StoryFact['evidence'] = [];
      if (filePath || quote) {
        if (!filePath || !quote) { setFactError('正文来源和原文证据必须同时填写；也可以两项都留空，作为作者直接确认。'); return; }
        const source = await window.workbench.readFile(filePath);
        const start = source.content.indexOf(quote);
        if (start < 0) { setFactError('所选文件中找不到这段原文。请复制连续原句，避免把概括冒充正文证据。'); return; }
        evidence.push({ filePath, quote, start, end: start + quote.length });
      }
      await window.workbench.appendEvent('fact.upsert', { subject, statement, category: candidate.category, id: crypto.randomUUID(), status: evidence.length ? 'text-explicit' : 'author-confirmed', evidence, updatedAt: new Date().toISOString() }, 'author');
      setFact({ subject: '', statement: '', category: 'character' }); setFactEvidence({ filePath: '', quote: '' }); setAdding(false); await onRefresh();
    } catch (error) { setFactError(errorMessage(error)); }
  };
  const beginEdit = (item: StoryFact, action: 'edit' | 'deprecate' | 'restore' = 'edit') => { setEditing(item); setFactAction(action); setDraft({ subject: item.subject, statement: item.statement, category: item.category }); setImpact(null); setIntentionalRetcon(false); setCreateRevisionTask(true); setChangeReason(''); setEditError(''); };
  const analyzeImpact = async () => {
    if (!editing) return;
    setImpactLoading(true); setEditError('');
    try { setImpact(await window.workbench.analyzeCanonImpact({ factId: editing.id, ...draft })); }
    catch (error) { setEditError(errorMessage(error)); }
    finally { setImpactLoading(false); }
  };
  const confirmChange = async () => {
    if (!editing || !impact) return;
    try {
      const updatedAt = new Date().toISOString();
      const status: StoryFact['status'] = factAction === 'deprecate' ? 'deprecated' : 'author-confirmed';
      await window.workbench.appendEvent('fact.upsert', { ...editing, ...draft, status, updatedAt }, 'author');
      await window.workbench.appendEvent('canon.impact-confirmed', { analysisId: impact.id, factId: editing.id, action: factAction, previous: impact.previous, proposed: { ...impact.proposed, status }, intentionalRetcon, reason: changeReason.trim(), affectedChapters: impact.affectedChapters.map((item) => item.filePath), affectedPlans: impact.affectedPlans.map((item) => item.filePath), relatedFactIds: impact.relatedFactIds, relatedTaskIds: impact.relatedTaskIds, confirmedAt: updatedAt }, 'author');
      const links = [...new Set([...impact.affectedChapters.map((item) => item.filePath), ...impact.affectedPlans.map((item) => item.filePath)])];
      if (createRevisionTask && links.length) await window.workbench.updateTask({ title: `复核“${draft.subject}”${factAction === 'deprecate' ? '废弃' : factAction === 'restore' ? '恢复' : '正典变更'}影响`, description: changeReason.trim() || `核对从“${impact.previous.statement}”调整为“${impact.proposed.statement}”后的正文与计划。`, status: 'next', kind: 'revision', assignee: 'author', source: 'author', priority: impact.affectedChapters.length > 3 ? 'high' : 'normal', whyNow: `正典影响分析发现 ${impact.affectedChapters.length} 个章节和 ${impact.affectedPlans.length} 份计划可能依赖这条事实。`, known: [impact.proposed.statement], missingDecisions: [], aiPreAnalysis: `影响分析 ${impact.id}`, authorDecision: `${factAction === 'deprecate' ? '废弃事实' : factAction === 'restore' ? '恢复事实' : intentionalRetcon ? '有意追溯修改' : '普通正典修订'}：${changeReason.trim()}`, agentWork: '', completionCriteria: ['逐项核对受影响正文与计划', '确认无意外知识边界或时间线冲突'], links, dependencies: [], level: 'work' });
      setEditing(null); setImpact(null); await onRefresh();
    } catch (error) { setEditError(errorMessage(error)); }
  };
  return <div className="page story-page">
    <header className="page-header-row"><div><span className="eyebrow">最小故事记忆</span><h2>事实有来源，推断不冒充正典</h2></div><div className="story-header-actions"><label className="story-search"><Search size={14} /><input value={factQuery} onChange={(event) => setFactQuery(event.target.value)} placeholder="搜索人物、规则、伏笔或来源…" />{factQuery && <button onClick={() => setFactQuery('')}><X size={12} /></button>}</label><button className="primary" onClick={beginAdd}><Plus size={16} />记录事实</button></div></header>
    <div className="fact-grid">{groups.map((group) => {
      const items = factsForGroup(group.key); const limit = factLimits[group.key] ?? 24;
      return <section key={group.key}><h3>{group.label}<span>{items.length}{factQuery ? ` / ${project.facts.filter((item) => item.category === group.key).length}` : ''}</span></h3>
        {items.slice(0, limit).map((item) => <article key={item.id}><div><b>{item.subject}</b><span className={`fact-status status-${item.status}`}>{statusLabels[item.status]}</span></div><p>{item.statement}</p><small>{item.evidence[0] ? `来源：${item.evidence[0].filePath}` : '尚无正文证据'}</small><footer className="fact-actions"><button onClick={() => beginEdit(item)}>影响分析与修改</button>{item.status === 'deprecated' ? <button onClick={() => beginEdit(item, 'restore')}>恢复使用</button> : <button className="destructive" onClick={() => beginEdit(item, 'deprecate')}>废弃事实</button>}</footer></article>)}
        {!items.length && <p className="empty-copy">{factQuery ? '本组没有匹配结果' : '暂无条目'}</p>}
        {items.length > limit && <button className="fact-load-more" onClick={() => setFactLimits((current) => ({ ...current, [group.key]: limit + 24 }))}>再显示 {Math.min(24, items.length - limit)} 条</button>}
      </section>;
    })}</div>
    {adding && <Modal title="记录故事事实" onClose={() => setAdding(false)}><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void addFact({ subject: String(data.get('subject') || ''), statement: String(data.get('statement') || ''), category: String(data.get('category') || 'character') as StoryFact['category'], filePath: String(data.get('filePath') || ''), quote: String(data.get('quote') || '') }); }}><label>类型<Select name="category" value={fact.category} onChange={(event) => setFact({ ...fact, category: event.target.value as StoryFact['category'] })}>{groups.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</Select></label><label>主体<input name="subject" value={fact.subject} onChange={(event) => setFact({ ...fact, subject: event.target.value })} placeholder="人物、地点或事件" /></label><label>事实陈述<textarea name="statement" value={fact.statement} onChange={(event) => setFact({ ...fact, statement: event.target.value })} /></label><label>正文来源（可选）<Select name="filePath" value={factEvidence.filePath} onChange={(event) => { setFactEvidence({ ...factEvidence, filePath: event.target.value }); setFactError(''); }}><option value="">无正文证据，作为作者直接确认</option>{project.files.filter((file) => file.category === 'manuscript').map((file) => <option value={file.path} key={file.path}>{file.path}</option>)}</Select></label><label>原文证据（选择来源时必填）<textarea name="quote" value={factEvidence.quote} onChange={(event) => { setFactEvidence({ ...factEvidence, quote: event.target.value }); setFactError(''); }} placeholder="复制一段连续原句；工作台会验证它确实存在于所选正文。" /></label>{factError && <p className="form-error">{factError}</p>}<div className="modal-actions"><button type="button" onClick={() => setAdding(false)}>取消</button><button type="submit" className="primary">{factEvidence.filePath ? '记录为正文明确事实' : '确认为作者事实'}</button></div></form></Modal>}
    {editing && <Modal title={`${factAction === 'deprecate' ? '废弃' : factAction === 'restore' ? '恢复' : '修改'}故事事实 · 先分析影响`} onClose={() => setEditing(null)}>
      {factAction === 'edit' ? <><label>类型<Select value={draft.category} onChange={(event) => updateDraft({ category: event.target.value as StoryFact['category'] })}>{groups.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</Select></label><label>主体<input value={draft.subject} onChange={(event) => updateDraft({ subject: event.target.value })} /></label><label>事实陈述<textarea value={draft.statement} onChange={(event) => updateDraft({ statement: event.target.value })} /></label></> : <><p className="warning-copy">{factAction === 'deprecate' ? '废弃不会抹掉历史，而是把这条事实标记为不再生效；相关正文、计划和任务必须先检查影响。' : '恢复会重新把这条事实作为作者确认内容使用；先检查后续正文是否已经形成冲突。'}</p><blockquote className="style-delete-quote"><b>{editing.subject}</b><br />{editing.statement}</blockquote></>}
      {editError && <p className="form-error">{editError}</p>}
      {impact && <section className="impact-report"><h4>影响分析</h4>{impact.warnings.map((warning) => <p className="impact-warning" key={warning}><CircleAlert size={13} />{warning}</p>)}<div className="impact-counts"><span>{impact.affectedChapters.length} 个章节</span><span>{impact.affectedPlans.length} 份计划</span><span>{impact.relatedFactIds.length} 条相关事实</span><span>{impact.relatedTaskIds.length} 个任务</span></div>{[...impact.affectedChapters, ...impact.affectedPlans].slice(0, 10).map((item) => <div className="impact-file" key={item.filePath}><b>{item.filePath}</b><span>{item.excerpt}</span></div>)}{factAction === 'edit' && <label className="impact-option"><input type="checkbox" checked={intentionalRetcon} onChange={(event) => setIntentionalRetcon(event.target.checked)} />这是作者有意的追溯修改</label>}<label className="impact-option"><input type="checkbox" checked={createRevisionTask} onChange={(event) => setCreateRevisionTask(event.target.checked)} />为受影响内容创建修订任务</label><label>{factAction === 'edit' ? '修改原因' : '操作原因'}<textarea value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder={factAction === 'deprecate' ? '说明为什么这条事实不再使用' : factAction === 'restore' ? '说明为什么恢复，以及如何处理后续冲突' : '说明为什么修改，以及希望保留什么边界'} /></label></section>}
      <div className="modal-actions"><button onClick={() => setEditing(null)}>取消</button><button disabled={impactLoading || !draft.subject.trim() || !draft.statement.trim()} onClick={() => void analyzeImpact()}>{impactLoading ? '正在分析…' : impact ? '重新分析' : '分析影响'}</button><button className={factAction === 'deprecate' ? 'danger-confirm' : 'primary'} disabled={!impact || ((factAction !== 'edit' || intentionalRetcon) && !changeReason.trim())} onClick={() => void confirmChange()}>{factAction === 'deprecate' ? '确认废弃' : factAction === 'restore' ? '确认恢复' : '确认修改正典'}</button></div>
    </Modal>}
  </div>;
}

function LegacyGitPanel({ project, onRefresh }: { project: ProjectState; onRefresh(): Promise<void> }) {
  const [selected, setSelected] = useState(project.git.files[0]?.path ?? ''); const [diff, setDiff] = useState<GitDiff[]>([]); const [commit, setCommit] = useState(false); const [message, setMessage] = useState(''); const [paths, setPaths] = useState<string[]>([]);
  useEffect(() => { if (selected) void window.workbench.gitDiff(selected).then(setDiff); }, [selected, project.git.files.length]);
  const contentFiles = project.git.files.filter((file) => file.category !== 'system'); const systemFiles = project.git.files.filter((file) => file.category === 'system');
  return <div className="git-page"><aside><header><GitBranch size={18} /><div><b>{project.git.branch}</b><span>{project.git.clean ? '工作区干净' : `${project.git.files.length} 项未提交变更`}</span></div></header><GitGroup title="正文与设定" files={contentFiles} selected={selected} onSelect={setSelected} /><GitGroup title="系统记录" files={systemFiles} selected={selected} onSelect={setSelected} collapsed /><button className="commit-button" disabled={project.git.clean} onClick={() => { setPaths(project.git.files.map((file) => file.path)); setCommit(true); }}><GitBranch size={16} />明确提交…</button></aside><section className="diff-view">{selected ? <><div className="diff-title"><b>{selected}</b><span>Git diff · 未暂存</span></div><pre>{diff.map((item) => item.patch).join('\n') || '这是未跟踪文件或当前没有可显示的文本差异。'}</pre></> : <div className="empty-editor"><GitBranch size={30} /><h2>没有未提交变更</h2></div>}</section>{commit && <Modal title="明确创建 Git 提交" onClose={() => setCommit(false)}><p className="warning-copy">只有本次勾选的文件会被暂存并提交。不会自动 push，也不会包含未勾选文件。</p><div className="commit-files">{project.git.files.map((file) => <label key={file.path}><input type="checkbox" checked={paths.includes(file.path)} onChange={(event) => setPaths((current) => event.target.checked ? [...current, file.path] : current.filter((item) => item !== file.path))} /><span>{file.path}</span></label>)}</div><label>提交说明<input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="例如：完成第一章初稿与对应任务记录" /></label><div className="modal-actions"><button onClick={() => setCommit(false)}>取消</button><button className="danger-confirm" disabled={!message.trim() || !paths.length} onClick={async () => { await window.workbench.gitCommit({ message, paths, explicitAuthorization: true }); setCommit(false); setMessage(''); await onRefresh(); }}>确认暂存并提交</button></div></Modal>}</div>;
}

function GitPanel({ project, onRefresh }: { project: ProjectState; onRefresh(): Promise<void> }) {
  const [selected, setSelected] = useState(project.git.files[0]?.path ?? '');
  const [versions, setVersions] = useState<GitFileVersions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commit, setCommit] = useState(false);
  const [message, setMessage] = useState('');
  const [paths, setPaths] = useState<string[]>([]);
  const [commitError, setCommitError] = useState('');
  const signature = project.git.files.map((file) => `${file.index}${file.workingTree}:${file.path}`).join('|');
  useEffect(() => {
    const next = project.git.files.some((file) => file.path === selected) ? selected : project.git.files[0]?.path ?? '';
    if (next !== selected) { setSelected(next); return; }
    if (!next) { setVersions(null); return; }
    let cancelled = false;
    setLoading(true); setError('');
    void window.workbench.gitFileVersions(next).then((value) => { if (!cancelled) setVersions(value); }).catch((cause) => { if (!cancelled) setError(errorMessage(cause)); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selected, signature]);
  const contentFiles = project.git.files.filter((file) => file.category !== 'system');
  const systemFiles = project.git.files.filter((file) => file.category === 'system');
  const selectedStatus = project.git.files.find((file) => file.path === selected);
  const localOnly = project.manifest.gitPolicy === 'local-only';
  return <div className="git-page"><aside><header><GitBranch size={18} /><div><b>{project.git.branch}</b><span>{project.git.clean ? '工作区干净' : `${project.git.files.length} 项未提交变更`}</span></div></header>{localOnly && <p className="git-policy-note">当前作品仅保存在本机：可以查看全部差异，但提交入口已锁定。</p>}<GitGroup title="正文与设定" files={contentFiles} selected={selected} onSelect={setSelected} /><GitGroup title="系统记录" files={systemFiles} selected={selected} onSelect={setSelected} collapsed /><button className="commit-button" disabled={project.git.clean || localOnly} title={localOnly ? '可在项目设置中修改 Git 提交策略' : undefined} onClick={() => { setPaths(project.git.files.map((file) => file.path)); setCommitError(''); setCommit(true); }}><GitBranch size={16} />{localOnly ? '仅本地，不提交' : '明确提交…'}</button></aside><section className="diff-view">{selected ? <><div className="diff-title"><div><b>{selected}</b><span>{selectedStatus?.index === '?' ? '新文件' : selectedStatus?.workingTree === 'D' ? '已删除' : '尚未提交'}</span></div><small>绿色是新增，红色是删除；行号可用于和 Agent 精确沟通。</small></div>{loading && <div className="diff-empty"><LoaderCircle className="spin" /><b>正在准备可读差异…</b></div>}{error && <div className="diff-empty error"><CircleAlert /><b>{error}</b></div>}{!loading && !error && versions && <GitDiffViewer versions={versions} />}</> : <div className="empty-editor"><GitBranch size={30} /><h2>工作区没有未提交变更</h2><p>保存正文后，改动会在这里按文件、行号和增删颜色展示。</p></div>}</section>{commit && <Modal title="明确创建 Git 提交" onClose={() => setCommit(false)}><form onSubmit={async (event) => { event.preventDefault(); const submittedMessage = String(new FormData(event.currentTarget).get('message') || '').trim(); if (!submittedMessage) { setCommitError('请输入提交说明。'); return; } if (!paths.length) { setCommitError('至少选择一个文件。'); return; } try { await window.workbench.gitCommit({ message: submittedMessage, paths, explicitAuthorization: true }); setCommit(false); setMessage(''); setCommitError(''); await onRefresh(); } catch (cause) { setCommitError(errorMessage(cause)); } }}><p className="warning-copy">只有本次勾选的文件会被暂存并提交。不会自动 push，也不会包含未勾选文件。</p><div className="commit-files">{project.git.files.map((file) => <label key={file.path}><input type="checkbox" checked={paths.includes(file.path)} onChange={(event) => setPaths((current) => event.target.checked ? [...current, file.path] : current.filter((item) => item !== file.path))} /><span>{file.path}</span></label>)}</div><label>提交说明<input name="message" value={message} onChange={(event) => { setMessage(event.target.value); setCommitError(''); }} placeholder="例如：完成第一章初稿与对应任务记录" /></label>{commitError && <p className="form-error">{commitError}</p>}<div className="modal-actions"><button type="button" onClick={() => setCommit(false)}>取消</button><button type="submit" className="danger-confirm" disabled={!paths.length}>确认暂存并提交</button></div></form></Modal>}</div>;
}

function GitGroup({ title, files, selected, onSelect, collapsed = false }: { title: string; files: ProjectState['git']['files']; selected: string; onSelect(value: string): void; collapsed?: boolean }) { const [open, setOpen] = useState(!collapsed); return <div className="git-group"><button className="git-group-title" onClick={() => setOpen(!open)}><ChevronRight className={open ? 'rotate' : ''} size={14} />{title}<span>{files.length}</span></button>{open && [...files].sort((a, b) => compareNaturalPath(a.path, b.path)).map((file) => <button className={selected === file.path ? 'active' : ''} key={file.path} onClick={() => onSelect(file.path)}><span className="change-code">{file.index === '?' ? 'U' : file.workingTree.trim() || file.index}</span><span>{file.path}</span>{file.origin !== 'unknown' && <small>{file.origin === 'pre-existing' ? '打开前已有' : file.origin === 'agent' ? 'Agent' : file.origin}</small>}</button>)}</div>; }

function LegacyStylePanel({ project, onAgent }: { project: ProjectState; onAgent(): void }) {
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [adding, setAdding] = useState(false);
  const [rule, setRule] = useState({ text: '', category: 'preference' as AuthorStyleRule['category'] });
  useEffect(() => { void window.workbench.getAuthorProfile().then(setProfile); }, [project.manifest.updatedAt]);
  const labels: Record<AuthorStyleRule['category'], string> = { preference: '长期偏好', strength: '稳定优势', improvement: '待提升能力', boundary: '内容边界', voice: '叙事声音' };
  return <div className="page style-page"><header className="page-header-row"><div><span className="eyebrow">长期风格与能力</span><h2>从重复证据中学习，不因一次拒绝改写你</h2><p>Observer 收集证据；记忆整理员提出候选规则，经作者确认才长期生效。</p></div><div className="profile-actions"><button onClick={async () => { const next = await window.workbench.importAuthorProfile(); if (next) setProfile(next); }}>导入档案</button><button onClick={() => void window.workbench.exportAuthorProfile()}>导出档案</button></div></header><div className="style-scopes"><section><Sparkles /><h3>作者级</h3><p>跨系列的长期偏好、优势与待提升能力。档案独立保存，可导入导出。</p><span>{profile ? `${profile.rules.filter((item) => item.status === 'confirmed').length} 条已确认规则` : '正在读取档案'}</span></section><section><BookOpen /><h3>系列级</h3><p>共同世界的语调、内容边界与叙事规范，保存在作品仓库。</p><span>{project.manifest.title}</span></section><section><Users /><h3>作品 / POV 级</h3><p>叙事距离、角色声音、用词与临时例外。</p><span>canon/作品风格.md</span></section></div><section className="candidate-memory"><div className="section-title"><Activity size={18} /><h3>作者规则</h3><button onClick={onAgent}>让记忆整理员提炼</button><button onClick={() => setAdding(true)}>作者直接记录</button></div><div className="style-rule-list">{profile?.rules.map((item) => <article key={item.id}><div><span>{labels[item.category]}</span><b>{item.status === 'confirmed' ? '已确认' : item.status === 'candidate' ? '候选' : '已拒绝'}</b></div><p>{item.text}</p>{item.evidence.length > 0 && <small>证据：{item.evidence.join('；')}</small>}{item.status === 'candidate' && <footer><button onClick={async () => setProfile(await window.workbench.upsertStyleRule({ id: item.id, status: 'confirmed' }))}>确认长期使用</button><button onClick={async () => setProfile(await window.workbench.upsertStyleRule({ id: item.id, status: 'rejected' }))}>拒绝</button></footer>}</article>)}{profile?.rules.length === 0 && <p className="empty-copy">还没有长期规则。作者可直接记录；AI 候选应有多次反馈证据后再确认。</p>}</div></section>{adding && <Modal title="记录作者级写作规则" onClose={() => setAdding(false)}><label>类型<Select value={rule.category} onChange={(event) => setRule({ ...rule, category: event.target.value as AuthorStyleRule['category'] })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label><label>规则<textarea value={rule.text} onChange={(event) => setRule({ ...rule, text: event.target.value })} placeholder="例如：紧张场景优先使用短句，减少解释性心理独白。" /></label><div className="modal-actions"><button onClick={() => setAdding(false)}>取消</button><button className="primary" disabled={!rule.text.trim()} onClick={async () => { setProfile(await window.workbench.upsertStyleRule({ ...rule, status: 'confirmed', evidence: ['作者直接确认'] })); setRule({ text: '', category: 'preference' }); setAdding(false); }}>确认为长期规则</button></div></Modal>}</div>;
}

function StylePanel({ project, onAgent }: { project: ProjectState; onAgent(): void }) {
  const labels: Record<AuthorStyleRule['category'], string> = { preference: '长期偏好', strength: '稳定优势', improvement: '待提升能力', boundary: '内容边界', voice: '叙事声音' };
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [editing, setEditing] = useState<AuthorStyleRule | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AuthorStyleRule | null>(null);
  const [draft, setDraft] = useState({ text: '', category: 'preference' as AuthorStyleRule['category'], evidence: '' });
  const [error, setError] = useState('');
  useEffect(() => { void window.workbench.getAuthorProfile().then(setProfile); }, [project.manifest.updatedAt]);
  const beginEdit = (rule?: AuthorStyleRule) => { setError(''); setEditing(rule || 'new'); setDraft({ text: rule?.text || '', category: rule?.category || 'preference', evidence: rule?.evidence.join('\n') || '' }); };
  const save = async (submitted?: { text: string; category: AuthorStyleRule['category']; evidence: string }) => {
    const value = submitted || draft;
    if (!editing || !value.text.trim()) { setError('规则不能为空。'); return; }
    try {
      const evidence = value.evidence.split('\n').map((item) => item.trim()).filter(Boolean);
      setProfile(await window.workbench.upsertStyleRule({ id: editing === 'new' ? undefined : editing.id, text: value.text.trim(), category: value.category, status: editing === 'new' ? 'confirmed' : editing.status, evidence: evidence.length ? evidence : editing === 'new' ? ['作者直接确认'] : [] }));
      setEditing(null);
    } catch (cause) { setError(errorMessage(cause)); }
  };
  const rules = [...(profile?.rules || [])].sort((a, b) => (a.status === 'candidate' ? 0 : a.status === 'confirmed' ? 1 : 2) - (b.status === 'candidate' ? 0 : b.status === 'confirmed' ? 1 : 2) || b.updatedAt.localeCompare(a.updatedAt));
  return <div className="page style-page"><header className="page-header-row"><div><span className="eyebrow">长期风格与能力</span><h2>把写作证据变成可编辑的作者能力</h2><p>记忆整理员只提出有多条证据的候选；作者确认、修改或删除后，规则才真正进入后续 Agent 上下文。</p></div><div className="profile-actions"><button onClick={async () => { const next = await window.workbench.importAuthorProfile(); if (next) setProfile(next); }}>导入档案</button><button onClick={() => void window.workbench.exportAuthorProfile()}>导出档案</button></div></header><div className="style-scopes"><section><Sparkles /><h3>作者级</h3><p>跨系列的长期偏好、优势与待提升能力，可独立导入导出。</p><span>{profile ? `${profile.rules.filter((item) => item.status === 'confirmed').length} 条已确认` : '正在读取'}</span></section><section><BookOpen /><h3>系列级</h3><p>当前仓库共享的叙事边界和世界语调，随 Git 迁移。</p><span>{project.manifest.title}</span></section><section><Users /><h3>作品 / POV 级</h3><p>角色声音、叙事距离和本书临时例外，证据保留来源。</p><span>canon/作品风格.md</span></section></div><section className="candidate-memory"><div className="section-title"><Activity size={18} /><h3>作者规则</h3><button onClick={onAgent}>让记忆整理员提炼</button><button onClick={() => beginEdit()}>作者直接记录</button></div><p className="style-explainer">候选不会自动生效。确认规则会进入后续 Writer、Observer 和编辑审校的上下文；删除后同步更新仓库快照。</p><div className="style-rule-list">{rules.map((rule) => <article className={`style-rule status-${rule.status}`} key={rule.id}><header><span>{labels[rule.category]}</span><b>{rule.status === 'confirmed' ? '已确认' : rule.status === 'candidate' ? '待确认' : '已拒绝'}</b></header><p>{rule.text}</p>{rule.evidence.length > 0 && <details><summary>{rule.evidence.length} 条证据</summary><ul>{rule.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul></details>}<footer>{rule.status === 'candidate' && <><button onClick={async () => setProfile(await window.workbench.upsertStyleRule({ id: rule.id, status: 'confirmed' }))}>确认使用</button><button onClick={async () => setProfile(await window.workbench.upsertStyleRule({ id: rule.id, status: 'rejected' }))}>拒绝</button></>}<button onClick={() => beginEdit(rule)}><Pencil size={11} />编辑</button><button className="destructive" onClick={() => setDeleting(rule)}><Trash2 size={11} />删除</button></footer></article>)}{!rules.length && <div className="style-empty"><Sparkles size={24} /><b>还没有可见的写作风格记录</b><p>先让记忆整理员读取近期正文与作者反馈，或直接记录一条你已经确定的规则。</p><button onClick={onAgent}>立即提炼</button></div>}</div></section>{editing && <Modal title={editing === 'new' ? '记录写作风格' : '编辑写作风格'} onClose={() => setEditing(null)}><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save({ text: String(data.get('text') || ''), category: String(data.get('category') || 'preference') as AuthorStyleRule['category'], evidence: String(data.get('evidence') || '') }); }}><label>类型<Select name="category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as AuthorStyleRule['category'] })}>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</Select></label><label>规则<textarea name="text" autoFocus value={draft.text} onChange={(event) => setDraft({ ...draft, text: event.target.value })} placeholder="例如：紧张场景使用短句，让规则通过动作与代价呈现。" /></label><label>证据（每行一条）<textarea name="evidence" value={draft.evidence} onChange={(event) => setDraft({ ...draft, evidence: event.target.value })} placeholder="章节、Observer 反馈或作者决定" /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" onClick={() => setEditing(null)}>取消</button><button type="submit" className="primary">保存规则</button></div></form></Modal>}{deleting && <Modal title="删除写作风格" onClose={() => setDeleting(null)}><p className="warning-copy">将从作者档案和当前仓库快照中移除这条规则。Git 历史仍可用于审查以前的版本。</p><blockquote className="style-delete-quote">{deleting.text}</blockquote><div className="modal-actions"><button onClick={() => setDeleting(null)}>取消</button><button className="danger-confirm" onClick={async () => { setProfile(await window.workbench.deleteStyleRule(deleting.id)); setDeleting(null); }}>确认删除</button></div></Modal>}</div>;
}

function LegacySettingsPanel({ settings, onChange, agents, repository: _repository, onProjectHub: _onProjectHub }: { settings: Settings; onChange(patch: Partial<Settings>): Promise<void>; agents: AgentAdapterInfo[]; repository: RepositoryInfo | null; onProjectHub(): void }) {
  const observerMode = (mode: Settings['observer']['mode']) => {
    const preset = mode === 'low' ? { idleMs: 45_000, changedCharacters: 350, minimumIntervalMs: 180_000 } : mode === 'high' ? { idleMs: 10_000, changedCharacters: 80, minimumIntervalMs: 45_000 } : { idleMs: 20_000, changedCharacters: 150, minimumIntervalMs: 90_000 };
    void onChange({ observer: { ...settings.observer, ...preset, mode } });
  };
  return <div className="page settings-page"><header><span className="eyebrow">项目与工作台设置</span><h2>默认安静工作，需要时才打断</h2></header><section><h3>保存</h3><SettingToggle label="智能自动保存" description={`停止输入 ${settings.autosave.delayMs / 1000} 秒后保存，不触发 Git 提交`} checked={settings.autosave.enabled} onChange={(enabled) => onChange({ autosave: { ...settings.autosave, enabled } })} /><NumberSetting label="停止输入后保存" description="只写入磁盘，不会 stage 或 commit" value={settings.autosave.delayMs / 1000} min={1} max={120} suffix="秒" onChange={(seconds) => onChange({ autosave: { ...settings.autosave, delayMs: seconds * 1000 } })} /><SettingToggle label="失焦保存" description="切换章节、窗口或应用时保存" checked={settings.autosave.saveOnBlur} onChange={(saveOnBlur) => onChange({ autosave: { ...settings.autosave, saveOnBlur } })} /></section><section><h3>Observer</h3><SettingToggle label="Writer 完成后自动文学审阅" description="独立于输入停顿观察；自动精读实际改动章节，并定期检查连续章节" checked={settings.review.afterWriter} onChange={(afterWriter) => onChange({ review: { ...settings.review, afterWriter } })} /><div className="setting-row"><div><b>观察频率</b><span>手动模式仍可随时点击立即检查</span></div><Select className="setting-select" value={settings.observer.mode} onChange={(event) => observerMode(event.target.value as Settings['observer']['mode'])}><option value="low">低频</option><option value="standard">标准</option><option value="high">高频</option><option value="manual">仅手动</option></Select></div><NumberSetting label="停止输入" description="达到字数阈值后等待多久发起分析" value={settings.observer.idleMs / 1000} min={5} max={300} suffix="秒" onChange={(seconds) => onChange({ observer: { ...settings.observer, idleMs: seconds * 1000 } })} /><NumberSetting label="变化字数阈值" description="自然段完成时可以提前触发" value={settings.observer.changedCharacters} min={20} max={2000} suffix="字" onChange={(changedCharacters) => onChange({ observer: { ...settings.observer, changedCharacters } })} /><NumberSetting label="自动分析间隔" description="连续输入期间合并到最新版本" value={settings.observer.minimumIntervalMs / 1000} min={10} max={900} suffix="秒" onChange={(seconds) => onChange({ observer: { ...settings.observer, minimumIntervalMs: seconds * 1000 } })} /><NumberSetting label="会话软预算" description="达到后暂停自动分析，定向检查仍可用" value={settings.observer.sessionSoftBudget} min={1} max={500} suffix="次" onChange={(sessionSoftBudget) => onChange({ observer: { ...settings.observer, sessionSoftBudget } })} /></section><section><h3>创作导航</h3><div className="setting-row"><div><b>引导强度</b><span>默认陪跑，只展示当下最重要的事</span></div><Select className="setting-select" value={settings.navigator.guidance} onChange={(event) => void onChange({ navigator: { ...settings.navigator, guidance: event.target.value as Settings['navigator']['guidance'] } })}><option value="teaching">教学</option><option value="companion">陪跑</option><option value="free">自由</option></Select></div><div className="setting-row"><div><b>规划方式</b><span>可随作品阶段切换</span></div><Select className="setting-select" value={settings.navigator.planning} onChange={(event) => void onChange({ navigator: { ...settings.navigator, planning: event.target.value as Settings['navigator']['planning'] } })}><option value="outline">大纲</option><option value="rolling">滚动规划</option><option value="exploratory">探索</option><option value="managed">托管</option></Select></div></section><section><h3>恢复快照</h3><div className="setting-row"><div><b>仓库外恢复</b><span>最多每 {settings.recovery.intervalMs / 1000} 秒去重保存；普通恢复点保留 {settings.recovery.retentionDays} 天</span></div><span className="setting-value">500 MB / 项目 · 2 GB / 全部</span></div></section><AgentModelSettings settings={settings} agents={agents} onChange={onChange} /><section><h3>Agent 适配器</h3>{agents.map((agent) => <AgentHealth agent={agent} key={agent.id} />)}</section></div>;
}

function SettingsPanel({ project, settings, onChange, onGitPolicy, agents, repository, onProjectHub }: { project: ProjectState; settings: Settings; onChange(patch: Partial<Settings>): Promise<void>; onGitPolicy(policy: GitPolicy): Promise<void>; agents: AgentAdapterInfo[]; repository: RepositoryInfo | null; onProjectHub(): void }) {
  const observerMode = (mode: Settings['observer']['mode']) => {
    const preset = mode === 'low' ? { idleMs: 45_000, changedCharacters: 350, minimumIntervalMs: 180_000 } : mode === 'high' ? { idleMs: 10_000, changedCharacters: 80, minimumIntervalMs: 45_000 } : mode === 'manual' ? { idleMs: 20_000, changedCharacters: 150, minimumIntervalMs: 90_000 } : { idleMs: 20_000, changedCharacters: 150, minimumIntervalMs: 90_000 };
    void onChange({ observer: { ...settings.observer, ...preset, mode } });
  };
  return <div className="page settings-page"><header><span className="eyebrow">项目与工作台设置</span><h2>清楚说明每个自动动作的边界</h2><p>设置修改立即生效；保存、Agent、Git 提交和删除始终是不同的动作。</p></header><section><h3>当前仓库</h3><div className="settings-repository"><div><b>{repository?.root || '正在读取仓库路径…'}</b><span>{repository?.remote || '未配置远端，仅保存在本机'} · {repository?.branch || 'main'}{repository?.head ? ` · ${repository.head}` : ''}</span></div><button onClick={onProjectHub}>管理作品与仓库</button></div><div className="setting-row"><div><b>Git 提交策略</b><span>{project.manifest.gitPolicy === 'local-only' ? '保留 Git diff，但锁定提交入口；适合只在本机保存的作品。' : '作者可在 Git 变更页逐项检查，并在明确确认后建立检查点。'}</span></div><Select className="setting-select" value={project.manifest.gitPolicy ?? 'author-checkpoints'} onChange={(event) => void onGitPolicy(event.target.value as GitPolicy)}><option value="author-checkpoints">作者确认后提交</option><option value="local-only">仅本地，不提交</option></Select></div></section><section><h3>保存</h3><SettingToggle label="智能自动保存" description={`停止输入 ${settings.autosave.delayMs / 1000} 秒后保存，不触发 Git 提交`} checked={settings.autosave.enabled} onChange={(enabled) => onChange({ autosave: { ...settings.autosave, enabled } })} /><NumberSetting label="停止输入后保存" description="只写入磁盘，不会 stage 或 commit" value={settings.autosave.delayMs / 1000} min={1} max={120} suffix="秒" onChange={(seconds) => onChange({ autosave: { ...settings.autosave, delayMs: seconds * 1000 } })} /><SettingToggle label="失焦保存" description="切换章节、窗口或应用时保存" checked={settings.autosave.saveOnBlur} onChange={(saveOnBlur) => onChange({ autosave: { ...settings.autosave, saveOnBlur } })} /></section><section><h3>Observer</h3><SettingToggle label="Writer 完成后自动文学审阅" description="独立于输入停顿观察；自动精读实际改动章节，并定期检查连续章节" checked={settings.review.afterWriter} onChange={(afterWriter) => onChange({ review: { ...settings.review, afterWriter } })} /><div className="setting-row"><div><b>观察频率</b><span>手动模式仍可随时点击立即检查</span></div><Select className="setting-select" value={settings.observer.mode} onChange={(event) => observerMode(event.target.value as Settings['observer']['mode'])}><option value="low">低频</option><option value="standard">标准</option><option value="high">高频</option><option value="manual">仅手动</option></Select></div><NumberSetting label="停止输入" description="达到字数阈值后等待多久发起分析" value={settings.observer.idleMs / 1000} min={5} max={300} suffix="秒" onChange={(seconds) => onChange({ observer: { ...settings.observer, idleMs: seconds * 1000 } })} /><NumberSetting label="变化字数阈值" description="自然段完成时可以提前触发" value={settings.observer.changedCharacters} min={20} max={2000} suffix="字" onChange={(changedCharacters) => onChange({ observer: { ...settings.observer, changedCharacters } })} /><NumberSetting label="自动分析间隔" description="连续输入期间合并到最新版本" value={settings.observer.minimumIntervalMs / 1000} min={10} max={900} suffix="秒" onChange={(seconds) => onChange({ observer: { ...settings.observer, minimumIntervalMs: seconds * 1000 } })} /><NumberSetting label="会话软预算" description="达到后暂停自动分析，定向检查仍可用" value={settings.observer.sessionSoftBudget} min={1} max={500} suffix="次" onChange={(sessionSoftBudget) => onChange({ observer: { ...settings.observer, sessionSoftBudget } })} /></section><section><h3>创作导航</h3><div className="setting-row"><div><b>引导强度</b><span>默认陪跑，只展示当下最重要的事</span></div><Select className="setting-select" value={settings.navigator.guidance} onChange={(event) => void onChange({ navigator: { ...settings.navigator, guidance: event.target.value as Settings['navigator']['guidance'] } })}><option value="teaching">教学</option><option value="companion">陪跑</option><option value="free">自由</option></Select></div><div className="setting-row"><div><b>规划方式</b><span>可随作品阶段切换</span></div><Select className="setting-select" value={settings.navigator.planning} onChange={(event) => void onChange({ navigator: { ...settings.navigator, planning: event.target.value as Settings['navigator']['planning'] } })}><option value="outline">大纲</option><option value="rolling">滚动规划</option><option value="exploratory">探索</option><option value="managed">托管</option></Select></div></section><section><h3>恢复快照</h3><div className="setting-row"><div><b>仓库外恢复</b><span>最多每 {settings.recovery.intervalMs / 1000} 秒去重保存；普通恢复点保留 {settings.recovery.retentionDays} 天</span></div><span className="setting-value">500 MB / 项目 · 2 GB / 全部</span></div></section><AgentModelSettings settings={settings} agents={agents} onChange={onChange} /><section><h3>Agent 适配器</h3>{agents.map((agent) => <AgentHealth agent={agent} key={agent.id} />)}</section></div>;
}

function AgentHealth({ agent }: { agent: AgentAdapterInfo }) { const labels: Array<[keyof AgentAdapterInfo['capabilities'], string]> = [['persistentSession', '持续会话'], ['resumeSession', '恢复'], ['appendMessage', '追加消息'], ['cancel', '取消'], ['structuredOutput', '结构化'], ['fileModification', '改文件'], ['interAgentMessaging', 'Agent 通信'], ['approvalEvents', '审批事件'], ['usage', '用量']]; return <div className="agent-health-detail"><div className="agent-health"><span className={agent.available ? 'online' : 'offline'} /><div><b>{agent.name}</b><small>{agent.available ? `${agent.version} · ${agent.diagnostic || '登录状态正常'}` : agent.reason}</small></div><span>{agent.available ? '已连接' : '不可用'}</span></div><div className="capability-list">{labels.map(([key, label]) => <span className={agent.capabilities[key] ? 'supported' : ''} key={key}>{agent.capabilities[key] ? <Check size={9} /> : <X size={9} />}{label}</span>)}</div></div>; }

function SettingToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange(value: boolean): void }) { return <div className="setting-row"><div><b>{label}</b><span>{description}</span></div><button className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><span /></button></div>; }

function NumberSetting({ label, description, value, min, max, suffix, onChange }: { label: string; description: string; value: number; min: number; max: number; suffix: string; onChange(value: number): void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const parsed = Number(draft);
    const next = Number.isFinite(parsed) && draft.trim() ? Math.max(min, Math.min(max, parsed)) : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };
  return <div className="setting-row"><div><b>{label}</b><span>{description}</span></div><label className="number-setting"><input type="number" value={draft} min={min} max={max} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { setDraft(String(value)); event.currentTarget.blur(); } }} /><span>{suffix}</span></label></div>;
}

function LegacyCommentsPanel({ comments, running, canCancel, error, active, count, budget, agents, adapter, onAdapter, onToggle, onAnalyze, onCancel, onSelect, onFeedback, onSendWriter }: { comments: ObserverComment[]; running: boolean; canCancel: boolean; error: string | null; active: boolean; count: number; budget: number; agents: AgentAdapterInfo[]; adapter: AgentAdapterInfo['id']; onAdapter(value: AgentAdapterInfo['id']): void; onToggle(): void; onAnalyze(): void; onCancel(): void; onSelect(comment: ObserverComment): void; onFeedback(comment: ObserverComment, action: 'accept' | 'reject' | 'defer' | 'review' | 'explain' | 'intentional', reason?: string): Promise<void>; onSendWriter(comment: ObserverComment): Promise<void> }) {
  const visible = comments.filter(commentNeedsAction);
  return <div className="panel-content comments-panel"><div className="observer-control"><div><span className={`pulse ${active ? 'on' : ''}`} /><div><b>Observer {active ? '观察中' : '已停止'}</b><small>{active ? `本会话 ${count}/${budget} 次自动分析` : '主动开启后持续陪跑'}</small></div></div><button onClick={onToggle}>{active ? <Square size={14} /> : <Play size={14} />}{active ? '停止' : '开启'}</button></div><Select aria-label="Observer Agent" className="observer-adapter" value={adapter} onChange={(event) => onAdapter(event.target.value as AgentAdapterInfo['id'])}>{agents.map((agent) => <option key={agent.id} value={agent.id} disabled={!agent.available}>{agent.name}{agent.available ? '' : '（不可用）'}</option>)}</Select>{error && <div className="observer-run-error"><CircleAlert size={14} /><span><b>上次检查未完成</b>{error}</span></div>}<button className={`manual-check ${running ? 'is-cancel' : ''}`} disabled={running && !canCancel} onClick={running ? onCancel : onAnalyze}>{running ? (canCancel ? <Square size={16} /> : <LoaderCircle className="spin" size={16} />) : <Eye size={16} />}{running ? (canCancel ? '停止本次检查' : '正在启动 Observer…') : error ? '重试检查' : '立即检查当前正文'}</button>{visible.length ? visible.map((comment) => <article className={`comment-card severity-${comment.severity} status-${comment.status}`} key={comment.id} onClick={() => onSelect(comment)}><div className="comment-meta"><span>{comment.issueType}</span><b>{comment.severity === 'blocking' ? '阻塞' : comment.severity === 'warning' ? '注意' : '建议'}</b></div><h4>{comment.summary}</h4><blockquote>{comment.anchor.quote}</blockquote><p>{comment.evidence}</p><div className="suggested-action"><WandSparkles size={14} />{comment.suggestedAction}</div>{comment.messages.length > 1 && <div className="comment-thread">{comment.messages.slice(1).map((message) => <p key={message.id}><b>{message.source === 'author' ? '作者' : 'Observer'}</b>{message.body}</p>)}</div>}{comment.status === 'stale' && <div className="stale-note">基于旧版本；原文字已变化，不挂到当前文字。</div>}<div className="comment-actions" onClick={(event) => event.stopPropagation()}>{<button className="send-writer" onClick={() => void onSendWriter(comment)}><Bot size={12} />发回 Writer</button>}<button onClick={() => void onFeedback(comment, 'accept')}>接受</button><button onClick={() => { const reason = prompt('拒绝理由（会帮助 Observer 学习）') || undefined; void onFeedback(comment, 'reject', reason); }}>拒绝</button><button onClick={() => void onFeedback(comment, 'defer')}>暂缓</button><button disabled={running} title={running ? '已有审阅正在进行，请完成后重试' : undefined} onClick={() => void onFeedback(comment, 'explain')}>要求解释</button><button disabled={running} title={running ? '已有审阅正在进行，请完成后重试' : undefined} onClick={() => void onFeedback(comment, 'review')}>修改后复查</button><button onClick={() => void onFeedback(comment, 'intentional')}>有意保留</button></div></article>) : <div className="panel-empty"><MessageSquareText size={28} /><b>还没有当前章节评论</b><span>没有评论不代表完成审阅。请到「文学审阅」查看范围、逐项结论和资料缺口。</span></div>}</div>;
}

function CommentsPanel({ comments, running, canCancel, canAnalyze, error, active, count, budget, agents, adapter, onAdapter, onToggle, onAnalyze, onCancel, onSelect, onFeedback, onSendWriter }: { comments: ObserverComment[]; running: boolean; canCancel: boolean; canAnalyze: boolean; error: string | null; active: boolean; count: number; budget: number; agents: AgentAdapterInfo[]; adapter: AgentAdapterInfo['id']; onAdapter(value: AgentAdapterInfo['id']): void; onToggle(): void; onAnalyze(): void; onCancel(): void; onSelect(comment: ObserverComment): void; onFeedback(comment: ObserverComment, action: 'accept' | 'reject' | 'defer' | 'review' | 'explain' | 'intentional', reason?: string): Promise<void>; onSendWriter(comment: ObserverComment): Promise<void> }) {
  const { actionable: visible, history } = partitionObserverComments(comments);
  type Decision = 'reject' | 'defer' | 'intentional';
  const labels: Record<Decision, string> = { reject: '拒绝建议', defer: '暂缓处理', intentional: '有意保留' };
  const [decision, setDecision] = useState<{ comment: ObserverComment; action: Decision } | null>(null);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const openFeedback = (comment: ObserverComment, action: Decision) => {
    setDecision({ comment, action }); setFeedbackReason(''); setFeedbackError('');
  };
  const submitFeedback = async (submittedReason: string) => {
    if (!decision || feedbackBusy) return;
    setFeedbackBusy(true); setFeedbackError('');
    try { await onFeedback(decision.comment, decision.action, submittedReason.trim() || undefined); setDecision(null); setFeedbackReason(''); }
    catch (error) { setFeedbackError(errorMessage(error)); }
    finally { setFeedbackBusy(false); }
  };
  return <div className="panel-content comments-panel">
    <div className="observer-control"><div><span className={`pulse ${active ? 'on' : ''}`} /><div><b>Observer {active ? '观察中' : '已停止'}</b><small>{active ? `本会话 ${count}/${budget} 次自动分析` : '主动开启后持续陪跑'}</small></div></div><button onClick={onToggle}>{active ? <Square size={14} /> : <Play size={14} />}{active ? '停止' : '开启'}</button></div>
    <Select aria-label="Observer Agent" className="observer-adapter" value={adapter} onChange={(event) => onAdapter(event.target.value as AgentAdapterInfo['id'])}>{agents.map((agent) => <option key={agent.id} value={agent.id} disabled={!agent.available}>{agent.name}{agent.available ? '' : '（不可用）'}</option>)}</Select>
    {error && <div className="observer-run-error"><CircleAlert size={14} /><span><b>上次检查未完成</b>{error}</span></div>}
    <button className={`manual-check ${running ? 'is-cancel' : ''}`} disabled={!canAnalyze || (running && !canCancel)} onClick={running ? onCancel : onAnalyze}>{running ? (canCancel ? <Square size={16} /> : <LoaderCircle className="spin" size={16} />) : <Eye size={16} />}{!canAnalyze ? '先打开正文' : running ? (canCancel ? '停止本次检查' : '正在启动 Observer…') : error ? '重试检查' : '立即检查当前正文'}</button>
    {!visible.length && history.length ? <CommentHistory comments={history} onSelect={onSelect} onFeedback={openFeedback} defaultOpen /> : null}
    {visible.length ? visible.map((comment) => <article className={`comment-card severity-${comment.severity} status-${comment.status}`} key={comment.id} onClick={() => onSelect(comment)}><div className="comment-meta"><span>{comment.issueType}</span><b>{comment.severity === 'blocking' ? '阻塞' : comment.severity === 'warning' ? '注意' : '建议'}</b></div><h4>{comment.summary}</h4><blockquote>{comment.anchor.quote}</blockquote><p>{comment.evidence}</p><div className="suggested-action"><WandSparkles size={14} />{comment.suggestedAction}</div>{comment.messages.length > 1 && <div className="comment-thread">{comment.messages.slice(1).map((message) => <p key={message.id}><b>{message.source === 'author' ? '作者' : 'Observer'}</b>{message.body}</p>)}</div>}{comment.status === 'stale' && <div className="stale-note">基于旧版本；原文字已变化，不挂到当前文字。</div>}<div className="comment-actions" onClick={(event) => event.stopPropagation()}>{<button className="send-writer" onClick={() => void onSendWriter(comment)}><Bot size={12} />发回 Writer</button>}<button onClick={() => void onFeedback(comment, 'accept')}>接受</button><button onClick={() => openFeedback(comment, 'reject')}>拒绝</button><button onClick={() => openFeedback(comment, 'defer')}>暂缓</button><button disabled={running} title={running ? '已有审阅正在进行，请完成后重试' : undefined} onClick={() => void onFeedback(comment, 'explain')}>要求解释</button><button disabled={running} title={running ? '已有审阅正在进行，请完成后重试' : undefined} onClick={() => void onFeedback(comment, 'review')}>修改后复查</button><button onClick={() => openFeedback(comment, 'intentional')}>有意保留</button></div></article>) : <div className="panel-empty"><MessageSquareText size={28} /><b>还没有当前章节评论</b><span>没有评论不代表完成审阅。请到「文学审阅」查看范围、逐项结论和资料缺口。</span></div>}
    {visible.length && history.length ? <CommentHistory comments={history} onSelect={onSelect} onFeedback={openFeedback} /> : null}
    {decision && <Modal title={`${labels[decision.action]} · Observer 反馈`} locked={feedbackBusy} onClose={() => setDecision(null)}><form onSubmit={(event) => { event.preventDefault(); void submitFeedback(String(new FormData(event.currentTarget).get('reason') || '')); }}><p className="modal-lead">{decision.comment.summary}</p><p className="modal-lead">这里只记录反馈，不改正文。理由会随评论保留，供后续 Agent 理解本次创作取舍；不会自动变成所有作品的风格规则。</p><label>反馈理由（可选）<textarea name="reason" autoFocus value={feedbackReason} onChange={(event) => setFeedbackReason(event.target.value)} placeholder="说明这次取舍、适用范围，或准备何时处理。" disabled={feedbackBusy} /></label>{feedbackError && <p className="form-error" role="alert">{feedbackError}</p>}<div className="modal-actions"><button type="button" disabled={feedbackBusy} onClick={() => setDecision(null)}>取消</button><button type="submit" className="primary" disabled={feedbackBusy}>{feedbackBusy ? '正在记录…' : `确认${labels[decision.action]}`}</button></div></form></Modal>}
  </div>;
}

function CommentHistory({ comments, onSelect, onFeedback, defaultOpen = false }: { comments: ObserverComment[]; onSelect(comment: ObserverComment): void; onFeedback?(comment: ObserverComment, action: 'reject' | 'intentional'): void; defaultOpen?: boolean }) {
  return <details className="comment-history" open={defaultOpen}>
    <summary><span><History size={13} />已处理与过期</span><b>{comments.length}</b></summary>
    <div>{comments.map((comment) => {
      const lastMessage = comment.messages.at(-1);
      return <div key={comment.id}><button type="button" className={`comment-history-card status-${comment.status}`} onClick={() => onSelect(comment)}>
        <span className="comment-history-meta"><em>{commentStatusLabel(comment.status)}</em><small>{comment.reviewCount ? `已复查 ${comment.reviewCount} 次` : relativeTime(comment.updatedAt)}</small></span>
        <strong>{comment.summary}</strong>
        <q>{comment.anchor.quote}</q>
        <span className="comment-history-result">{lastMessage?.body || comment.evidence}</span>
      </button>{onFeedback && (comment.status === 'rejected' || comment.status === 'intentional') && <button type="button" className="comment-history-feedback" onClick={() => onFeedback(comment, comment.status === 'intentional' ? 'intentional' : 'reject')}>补充反馈理由</button>}</div>;
    })}</div>
  </details>;
}

function suggestedAgentRole(filePath?: string): AgentRole {
  if (filePath?.startsWith('research/')) return 'researcher';
  if (filePath?.startsWith('planning/')) return 'navigator';
  if (filePath?.startsWith('canon/')) return 'canon-keeper';
  return 'writer';
}

function AgentsPanel({ project, agents, events, buffer, contextPack, preset, onContext, onShowContext, onRefresh, onReloadAgents }: { project: ProjectState; agents: AgentAdapterInfo[]; events: AgentEvent[]; buffer: BufferState | null; contextPack: ContextPack | null; preset: { role: AgentRole; objective: string; nonce: number } | null; onContext(pack: ContextPack): void; onShowContext(): void; onRefresh(): Promise<void>; onReloadAgents(): Promise<AgentAdapterInfo[]> }) {
  const initialRole = suggestedAgentRole(buffer?.path);
  const initialObjective = suggestedObjectiveForAgent(project.tasks, project.continueCard.focus, initialRole, buffer?.path);
  const [objective, setObjective] = useState(initialObjective); const [role, setRole] = useState<AgentRole>(initialRole); const [adapter, setAdapter] = useState<AgentAdapterInfo['id']>(agents.find((item) => item.available)?.id ?? 'codex'); const [allowNetwork, setAllowNetwork] = useState(false); const [running, setRunning] = useState(false); const [preparing, setPreparing] = useState(false); const [checking, setChecking] = useState(false); const [error, setError] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [scopeOpen, setScopeOpen] = useState(false);
  useEffect(() => setSelectedChapters([]), [buffer?.path]);
  const writerScope = selectedChapters.length ? selectedChapters : buffer ? [buffer.path] : ['manuscript'];
  const lastAutomaticObjective = useRef(initialObjective);
  const lastBufferPath = useRef(buffer?.path);
  useEffect(() => { if (preset) { setRole(preset.role); setObjective(preset.objective); } }, [preset?.nonce]);
  useEffect(() => {
    if (preset) return;
    const nextRole = suggestedAgentRole(buffer?.path);
    const nextObjective = suggestedObjectiveForAgent(project.tasks, project.continueCard.focus, nextRole, buffer?.path);
    const pathChanged = lastBufferPath.current !== buffer?.path;
    lastBufferPath.current = buffer?.path;
    setRole(nextRole);
    setObjective((current) => {
      const shouldRefresh = pathChanged || !current.trim() || current === lastAutomaticObjective.current;
      lastAutomaticObjective.current = nextObjective;
      return shouldRefresh ? nextObjective : current;
    });
  }, [buffer?.path, preset, project.continueCard.focus, project.tasks]);
  const records = [...project.agentTasks].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const selectedAgent = agents.find((item) => item.id === adapter);
  const writerBusy = role === 'writer' && records.some((item) => item.role === 'writer' && item.state === 'running');
  const duplicateBusy = records.some((item) => item.role === role && item.state === 'running' && item.objective.trim() === objective.trim());
  const contextMatches = Boolean(contextPack && contextPack.task === objective && (!buffer || contextPack.items.some((item) => item.kind === 'current-buffer' && item.source === buffer.path)));
  const buildContext = async () => {
    setPreparing(true); setError('');
    try {
      const pack = buffer ? await window.workbench.createContextPack({ task: objective, filePath: buffer.path, content: buffer.content }) : await window.workbench.createContextPack({ task: objective });
      onContext(pack);
      return pack;
    } finally { setPreparing(false); }
  };
  const run = async () => {
    if (!objective.trim() || writerBusy) return;
    if (duplicateBusy) { setError(`相同的 ${role} 任务已经在运行，请等待完成或先停止。`); return; }
    setRunning(true); setError(''); let taskId: string | undefined;
    try {
      const pack = contextMatches ? contextPack! : await buildContext();
      const currentTask = currentTaskForAgent(project.tasks, role, objective);
      const fallbackCriteria = role === 'writer' ? ['正文直接写入授权文件', '遵守当前目标、正典和角色知识边界', '最终列出实际修改'] : role === 'researcher' ? ['研究结果只写入 research/', '标出来源、推断和待核实问题', '不得修改正文或正典'] : ['navigator', 'architect'].includes(role) ? ['先诊断再给 2～4 条可比较路线', '说明效果、代价、风险和后续影响'] : ['完成角色职责范围内的分析', '区分正文证据、推断和建议，明确仍需作者决定的事项'];
      const completionCriteria = currentTask?.completionCriteria.length ? currentTask.completionCriteria : fallbackCriteria;
      const task = currentTask || await window.workbench.updateTask({ title: objective.split(/\r?\n/)[0].slice(0, 96), description: objective, status: 'now', kind: role === 'researcher' ? 'research' : role === 'editor' ? 'review' : role === 'writer' ? 'writing' : 'revision', assignee: role, source: 'author', whyNow: '作者从 Agent 会话明确启动了这项工作。', aiPreAnalysis: `上下文包 ${pack.id} · ${pack.characters}/${pack.budget} 字符`, completionCriteria, links: buffer ? [buffer.path] : [] });
      taskId = task.id;
      await window.workbench.runAgent({ adapterId: adapter, role, objective, creativeTaskId: task.id, scope: role === 'writer' ? writerScope : role === 'researcher' ? ['research'] : ['planning', 'canon'], completionCriteria, contextPack: pack, allowNetwork: role === 'researcher' && allowNetwork });
      await onRefresh();
    } catch (cause) { const message = errorMessage(cause); setError(message); if (taskId) await window.workbench.updateTask({ id: taskId, status: 'cancelled', cancellationReason: `Agent 未启动：${message}` }).catch(() => {}); await onRefresh(); } finally { setRunning(false); }
  };
  return <div className="panel-content agents-panel"><div className={`agent-bridge-status ${selectedAgent?.available ? 'connected' : 'disconnected'}`}><span /><div><b>{selectedAgent?.available ? `${selectedAgent.name} 已连接` : `${selectedAgent?.name || 'Agent'} 不可用`}</b><small>{selectedAgent?.available ? `${selectedAgent.version} · ${selectedAgent.diagnostic || '认证正常'}` : selectedAgent?.reason || '未检测到可用 Agent'}</small></div><button disabled={checking} onClick={async () => { setChecking(true); setError(''); try { const next = await onReloadAgents(); const selected = next.find((item) => item.id === adapter); if (!selected) setAdapter(next[0]?.id ?? 'codex'); } catch (cause) { setError(errorMessage(cause)); } finally { setChecking(false); } }}>{checking ? <LoaderCircle className="spin" size={12} /> : <Activity size={12} />}重新检测</button></div><div className="agent-compose"><div className="compose-row"><Select aria-label="任务 Agent" value={adapter} onChange={(event) => setAdapter(event.target.value as AgentAdapterInfo['id'])}>{agents.map((agent) => <option key={agent.id} value={agent.id} disabled={!agent.available}>{agent.name}{agent.available ? '' : '（不可用）'}</option>)}</Select><Select aria-label="任务角色" value={role} onChange={(event) => setRole(event.target.value as AgentRole)}><option value="writer">Writer · 直接写正文</option><option value="navigator">Navigator · 下一步</option><option value="architect">Story Architect · 卡文推演</option><option value="editor">Editor · 结构审校</option><option value="canon-keeper">Canon Keeper · 设定核查</option><option value="style-coach">Style Coach · 风格训练</option><option value="researcher">Researcher · 资料任务</option><option value="release-assistant">Release Assistant · 发布准备</option><option value="memory-curator">记忆整理员 · 提炼长期规则</option></Select></div><textarea value={objective} onChange={(event) => setObjective(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); void run(); } }} placeholder="告诉 Agent 要完成什么。Command/Ctrl + Enter 开始任务。" /><div className="scope-note"><ShieldAlert size={13} />{role === 'writer' ? `修改范围：${writerScope.join('、')}` : role === 'researcher' ? '可写范围：research/；禁止修改正文、正典和规划' : '只读分析；规划和正典变化作为候选返回'}</div>{role === 'writer' && <div className="writer-chapter-scope"><button type="button" aria-expanded={scopeOpen} onClick={() => setScopeOpen((open) => !open)}>选择多章改写范围（已选 {selectedChapters.length} 章）</button>{scopeOpen && <><p>未勾选时使用当前章节；开始前自动保存改稿恢复点。</p>{project.files.filter((file) => file.category === 'manuscript').map((file) => <label key={file.path}><input type="checkbox" checked={selectedChapters.includes(file.path)} onChange={(event) => setSelectedChapters((current) => event.target.checked ? [...current, file.path] : current.filter((path) => path !== file.path))} />{fileTitle(file.path)}</label>)}</>}</div>}{role === 'researcher' && <label className="network-task-toggle"><input type="checkbox" checked={allowNetwork} onChange={(event) => setAllowNetwork(event.target.checked)} /><span><b>允许本任务联网检索</b>仅本次 Researcher 任务生效，不修改 Agent 全局权限</span></label>}{writerBusy && <p className="agent-busy-note">已有 Writer 正在修改正文。完成或停止后才能启动下一个 Writer。</p>}{error && <p className="form-error">{error}</p>}<div className="agent-run-actions"><button className="prepare-context" disabled={preparing || running || !objective.trim()} onClick={async () => { try { await buildContext(); onShowContext(); } catch (cause) { setError(errorMessage(cause)); } }}>{preparing ? <LoaderCircle className="spin" size={15} /> : <Archive size={15} />}{preparing ? '正在组装…' : contextMatches ? '调整上下文' : '预览上下文'}</button><button className="primary run-agent" onClick={run} disabled={running || writerBusy || !selectedAgent?.available}>{running ? <LoaderCircle className="spin" size={16} /> : <Bot size={16} />}{running ? '正在启动…' : writerBusy ? 'Writer 正在工作' : '开始任务'}</button></div></div>{contextPack && <button className={`context-summary ${contextMatches ? '' : 'stale'}`} onClick={onShowContext}><Archive size={15} /><span>{contextMatches ? `本次上下文 ${contextPack.characters.toLocaleString()} / ${contextPack.budget.toLocaleString()} 字符` : '任务内容已变化，需要重新组装上下文'}</span></button>}<div className="agent-history"><div className="agent-history-title"><h3>会话与任务</h3>{records.some((item) => item.state === 'running') && <button onClick={async () => { await window.workbench.stopAllAgents(); await onRefresh(); }}><Square size={11} />停止全部</button>}</div>{records.length ? records.map((record) => <AgentRecord key={record.id} record={record} events={events.filter((item) => item.taskId === record.id)} onRefresh={onRefresh} />) : <div className="panel-empty"><Bot size={27} /><b>还没有 Agent 任务</b><span>让 Writer 写作，或让 Navigator 帮你处理卡文。</span></div>}</div></div>;
}

const AGENT_STATE_LABEL: Record<AgentTaskRecord['state'], string> = { queued: '排队中', running: '运行中', 'awaiting-author': '等待作者', completed: '已完成', failed: '失败', cancelled: '已停止', interrupted: '已中断' };


function AgentRecord({ record, events, onRefresh }: { record: AgentTaskRecord; events: AgentEvent[]; onRefresh(): Promise<void> }) {
  const [open, setOpen] = useState(record.state === 'running');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const progress = record.finalMessage || agentEventText(events) || (record.state === 'running' ? 'Agent 已连接，正在读取上下文…' : '没有可显示的结果摘要。');
  return <article className={`agent-record agent-${record.state}`}>
    <button className="agent-record-head" onClick={() => setOpen(!open)}><span className={`agent-state-dot ${record.state}`} /><div><b>{record.role}</b><small>{record.objective}</small></div><span>{AGENT_STATE_LABEL[record.state]}</span></button>
    <small className="agent-model-choice">指定模型：{record.model || (record.reasoningEffort ? 'CLI默认（未指定）' : '历史任务未记录')} · 推理：{record.reasoningEffort || '未记录'}</small>
    {open && <div className="agent-record-body">
      <p>{progress}</p>
      {record.sessionId && <small className="agent-session-id">会话 {record.sessionId.slice(0, 12)}…</small>}
      {record.changedFiles.length > 0 && <div className="changed-files">修改：{record.changedFiles.join('、')}</div>}
      {Boolean(record.concurrentAgentFiles?.length) && <div className="changed-files">同期其他 Writer 已核实的改动：{record.concurrentAgentFiles!.join('、')}</div>}
      {Boolean(record.concurrentAuthorFiles?.length) && <div className="changed-files">同期作者编辑（不计入 Agent 修改）：{record.concurrentAuthorFiles!.join('、')}</div>}
      {record.verifiedTextFiles?.length ? <div className="verified-text-files"><b>工作台核验</b>{record.verifiedTextFiles.map((file) => <span key={file.path}>{file.path} · {file.nonWhitespaceCharacters.toLocaleString()} 个非空白字符</span>)}</div> : null}
      {record.error && <div className="form-error">{record.error}</div>}
      {record.state === 'running' && <button onClick={async () => { await window.workbench.cancelAgent(record.id); await onRefresh(); }}><Square size={13} />停止并接管</button>}
      {record.state !== 'running' && record.sessionId && <div className="agent-followup"><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="追问、补充反馈，或要求在原授权范围内继续…" /><button disabled={!message.trim() || sending} onClick={async () => { setSending(true); try { await window.workbench.sendAgentMessage(record.id, message); setMessage(''); await onRefresh(); } finally { setSending(false); } }}>续接会话</button></div>}
    </div>}
  </article>;
}

function ContextPanel({ pack, onBuild, onChange }: { pack: ContextPack | null; onBuild(): void; onChange(pack: ContextPack): void }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const toggle = (itemId: string, included: boolean) => {
    if (!pack) return;
    const result = setContextItemIncluded(pack, itemId, included);
    if (result.error) setError(result.error); else { setError(''); onChange(result.pack); }
  };
  const addNote = () => {
    if (!pack) return;
    const result = addAuthorContextNote(pack, note, crypto.randomUUID());
    if (result.error) setError(result.error); else { setError(''); setNote(''); onChange(result.pack); }
  };
  return <div className="panel-content context-panel"><div className="context-header"><div><b>Agent 看到了什么</b><span>勾选内容会真实进入下一次任务</span></div><button onClick={onBuild}>重新组装</button></div>{pack ? <><div className="budget-bar"><span style={{ width: `${Math.min(100, pack.characters / pack.budget * 100)}%` }} /><small>{pack.characters.toLocaleString()} / {pack.budget.toLocaleString()} 字符</small></div><div className="context-author-note"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="补充本次任务的临时背景、例外或作者要求…" /><button disabled={!note.trim()} onClick={addNote}>加入本次上下文</button></div>{error && <p className="form-error context-error">{error}</p>}{pack.items.map((item) => <details key={item.id} className={item.included ? '' : 'excluded'}><summary><span><input type="checkbox" checked={item.included} disabled={item.kind === 'current-buffer'} title={item.kind === 'current-buffer' ? '当前任务正文不能排除' : item.included ? '从本次上下文排除' : '加入本次上下文'} onClick={(event) => event.stopPropagation()} onChange={(event) => toggle(item.id, event.target.checked)} />{item.title}</span><small>{item.characters} 字</small></summary><div><b>来源：{item.source}</b><p>{item.reason}</p><pre>{item.content.slice(0, 1_500)}{item.content.length > 1_500 ? '\n…' : ''}</pre></div></details>)}{pack.gaps.map((gap) => <p className="context-gap" key={gap}><CircleAlert size={14} />{gap}</p>)}</> : <div className="panel-empty"><Archive size={28} /><b>尚未组装上下文</b><span>先预览上下文，再决定是否排除资料或补充临时说明。</span><button onClick={onBuild}>查看当前上下文</button></div>}</div>;
}

function EmptyCenter({ view, onBack }: { view: 'agents' | 'comments'; onBack(): void }) { return <div className="empty-editor">{view === 'agents' ? <Bot size={34} /> : <MessageSquareText size={34} />}<h2>{view === 'agents' ? 'Agent 会话在右侧进行' : '评论线程在右侧显示'}</h2><p>正文仍是工作台中心。你可以一边看原文，一边处理建议和任务。</p><button className="primary" onClick={onBack}>返回写作现场</button></div>; }

function RecoveryDialog({ path, onClose, onRestore }: { path: string; onClose(): void; onRestore(content: string): void }) {
  const [entries, setEntries] = useState<Array<{ id: string; path: string; createdAt: string; reason: string; size: number }>>([]);
  const [error, setError] = useState('');
  useEffect(() => { void window.workbench.listRecovery(path).then(setEntries).catch((cause) => setError(errorMessage(cause))); }, [path]);
  const reason: Record<string, string> = { 'periodic-dirty-buffer': '编辑中自动恢复点', 'window-blur': '窗口失焦前', 'session-end': '上次写作会话结束', 'before-external-conflict': '外部修改冲突前', 'before-agent-conflict': 'Agent 冲突保护前', 'before-conflict-resolution': '合并冲突前' };
  return <Modal title={`恢复版本 · ${fileTitle(path)}`} onClose={onClose}><p className="warning-copy">恢复只把内容放回编辑缓冲区，不会立刻保存，也不会创建 Git 提交。你可以先检查再决定。</p>{error && <p className="form-error">{error}</p>}<div className="recovery-list">{entries.map((entry) => <article key={entry.id}><div><b>{new Date(entry.createdAt).toLocaleString()}</b><span>{(entry.size / 1024).toFixed(1)} KB</span></div><p>{reason[entry.reason] || entry.reason}</p><button onClick={async () => { try { const restored = await window.workbench.restoreRecovery(entry.id); onRestore(restored.content); } catch (cause) { setError(errorMessage(cause)); } }}>恢复到未保存缓冲区</button></article>)}{entries.length === 0 && <p className="empty-copy">当前文件还没有恢复点。</p>}</div></Modal>;
}

function LegacyConflictDialog({ buffer, onResolve, onUseDisk }: { buffer: BufferState; onResolve(content: string): Promise<void>; onUseDisk(): void }) { const [merged, setMerged] = useState(buffer.content); return <Modal title="检测到并发修改" onClose={() => {}} locked><p className="warning-copy">磁盘文件已被 Agent 或外部编辑器修改，同时你还有未保存内容。工作台没有覆盖任何一方，请选择或手工合并。</p><div className="merge-columns"><section><b>你的缓冲区</b><pre>{buffer.content}</pre><button onClick={() => setMerged(buffer.content)}>采用这一版</button></section><section><b>开始编辑时的磁盘基线</b><pre>{buffer.savedContent}</pre><button onClick={() => setMerged(buffer.savedContent)}>采用基线</button></section><section><b>磁盘最新版</b><pre>{buffer.conflict?.diskContent}</pre><button onClick={() => setMerged(buffer.conflict?.diskContent || '')}>采用这一版</button></section></div><label>合并结果<textarea className="merge-editor" value={merged} onChange={(event) => setMerged(event.target.value)} /></label><div className="modal-actions"><button onClick={onUseDisk}>放弃我的未保存修改</button><button className="primary" onClick={() => void onResolve(merged)}>保存合并结果</button></div></Modal>; }

function ConflictDialog({ buffer, onResolve, onUseDisk }: { buffer: BufferState; onResolve(content: string): Promise<void>; onUseDisk(): void }) {
  const analysis = useMemo(() => mergeThreeWay(buffer.savedContent, buffer.content, buffer.conflict?.diskContent || ''), [buffer.savedContent, buffer.content, buffer.conflict?.diskContent]);
  const [choices, setChoices] = useState<Record<string, MergeChoice>>({});
  const [manual, setManual] = useState<string | null>(null);
  const automatic = renderThreeWayMerge(analysis, choices);
  const unresolved = analysis.conflicts.filter((conflict) => !choices[conflict.id]).length;
  const choose = (id: string, choice: MergeChoice) => { setChoices((current) => ({ ...current, [id]: choice })); setManual(null); };
  return <Modal title="检测到并发修改" onClose={() => {}} locked>
    <p className={`merge-summary ${analysis.automatic ? 'clean' : 'conflicted'}`}>{analysis.automatic ? '作者与磁盘修改范围不重叠，工作台已自动合并。请检查后保存。' : `已自动保留不冲突修改，仍有 ${analysis.conflicts.length} 段需要作者决定。`}</p>
    {analysis.conflicts.map((conflict, index) => <section className="merge-conflict-card" key={conflict.id}><header><b>冲突 {index + 1}</b><span>{choices[conflict.id] ? '已选择' : '待决定'}</span></header><div><article><b>你的缓冲区</b><pre>{conflict.ours || '（删除此段）'}</pre><button className={choices[conflict.id] === 'ours' ? 'selected' : ''} onClick={() => choose(conflict.id, 'ours')}>采用作者版</button></article><article><b>编辑基线</b><pre>{conflict.base || '（原本为空）'}</pre><button className={choices[conflict.id] === 'base' ? 'selected' : ''} onClick={() => choose(conflict.id, 'base')}>保留基线</button></article><article><b>磁盘最新版</b><pre>{conflict.theirs || '（删除此段）'}</pre><button className={choices[conflict.id] === 'theirs' ? 'selected' : ''} onClick={() => choose(conflict.id, 'theirs')}>采用磁盘版</button></article></div></section>)}
    <details className="merge-whole-versions"><summary>查看或整版采用三个完整版本</summary><div className="merge-columns"><section><b>你的缓冲区</b><pre>{buffer.content}</pre><button onClick={() => setManual(buffer.content)}>整版采用作者版</button></section><section><b>开始编辑时的磁盘基线</b><pre>{buffer.savedContent}</pre><button onClick={() => setManual(buffer.savedContent)}>整版采用基线</button></section><section><b>磁盘最新版</b><pre>{buffer.conflict?.diskContent}</pre><button onClick={() => setManual(buffer.conflict?.diskContent || '')}>整版采用磁盘版</button></section></div></details>
    <label>最终合并结果<textarea className="merge-editor" value={manual ?? automatic} onChange={(event) => setManual(event.target.value)} /></label>
    <div className="modal-actions"><button onClick={onUseDisk}>放弃我的未保存修改</button><button className="primary" disabled={manual === null && unresolved > 0} onClick={() => void onResolve(manual ?? automatic)}>{manual === null && unresolved > 0 ? `还有 ${unresolved} 段未决定` : '保存合并结果'}</button></div>
  </Modal>;
}

function Modal({ title, onClose, locked = false, children }: { title: string; onClose(): void; locked?: boolean; children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      const preferred = dialogRef.current?.querySelector<HTMLElement>('[autofocus]');
      const first = dialogRef.current?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
      (preferred || first)?.focus();
    });
    return () => { cancelAnimationFrame(frame); previous?.focus(); };
  }, []);
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !locked) { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])].filter((element) => element.offsetParent !== null);
    if (!focusable.length) { event.preventDefault(); return; }
    const current = document.activeElement;
    const index = focusable.indexOf(current as HTMLElement);
    const next = event.shiftKey ? (index <= 0 ? focusable.at(-1)! : focusable[index - 1]) : (index === -1 || index === focusable.length - 1 ? focusable[0] : focusable[index + 1]);
    event.preventDefault(); next.focus();
  };
  return <div className="modal-backdrop"><div className="modal" ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} onKeyDown={onKeyDown}><header><h3>{title}</h3>{!locked && <button type="button" aria-label="关闭对话框" onClick={onClose}><X size={17} /></button>}</header><div className="modal-body">{children}</div></div></div>;
}
