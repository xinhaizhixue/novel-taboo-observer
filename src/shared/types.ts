import type { DEFAULT_SETTINGS } from './constants.js';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type Settings = typeof DEFAULT_SETTINGS;
export type SaveState = 'saved' | 'dirty' | 'saving' | 'agent-editing' | 'observer-running' | 'stale-analysis' | 'conflict';
export type EventSource = 'author' | 'writer' | 'observer' | 'navigator' | 'system' | 'agent';
export type TaskStatus = 'now' | 'next' | 'blocked' | 'completed' | 'cancelled';
export type TaskKind = 'writing' | 'canon' | 'research' | 'revision' | 'review' | 'release';
export type ScopeLevel = 'series' | 'work' | 'volume' | 'chapter' | 'scene' | 'session';
export type FactStatus = 'author-confirmed' | 'text-explicit' | 'agent-inferred' | 'ai-suggested' | 'conflict' | 'deprecated';
export type AgentRole = 'writer' | 'observer' | 'navigator' | 'architect' | 'canon-keeper' | 'style-coach' | 'researcher' | 'editor' | 'release-assistant' | 'memory-curator';

export interface ProjectManifest {
  schemaVersion: number;
  projectId: string;
  title: string;
  kind: 'series' | 'novel';
  language: string;
  createdAt: string;
  updatedAt: string;
  targetCharacters?: number;
  activeWorkId?: string;
  works: Array<{ id: string; title: string; manuscriptRoot: string; status: 'planning' | 'serializing' | 'revision' | 'completed' }>;
  authorProfile?: { id: string; snapshot?: string };
}

export interface ProjectFile {
  path: string;
  name: string;
  extension: string;
  category: 'manuscript' | 'canon' | 'planning' | 'research' | 'decision' | 'system' | 'other';
  size: number;
  modifiedAt: string;
}
export interface SearchResult { path: string; line: number; excerpt: string }

export interface NovelEvent<T = JsonValue> {
  schemaVersion: number;
  id: string;
  type: string;
  createdAt: string;
  sessionId: string;
  source: EventSource;
  payload: T;
}

export interface Goal {
  id: string;
  level: ScopeLevel;
  title: string;
  description: string;
  authority: 'author-pinned' | 'active-task' | 'confirmed-plan' | 'agent-suggestion';
  status: 'active' | 'completed' | 'paused';
  target?: string;
  updatedAt: string;
}

export interface CreativeTask {
  id: string;
  title: string;
  description: string;
  level: ScopeLevel;
  status: TaskStatus;
  kind: TaskKind;
  assignee: 'author' | AgentRole;
  source: EventSource;
  priority: 'low' | 'normal' | 'high' | 'critical';
  whyNow: string;
  known: string[];
  missingDecisions: string[];
  aiPreAnalysis: string;
  authorDecision: string;
  agentWork: string;
  completionCriteria: string[];
  links: string[];
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  cancellationReason?: string;
}

export interface TextAnchor {
  filePath: string;
  start: number;
  end: number;
  quote: string;
  prefix: string;
  suffix: string;
  snapshotId: string;
  snapshotHash: string;
  currentHash?: string;
}

export type CommentStatus = 'open' | 'accepted' | 'rejected' | 'deferred' | 'review-requested' | 'resolved' | 'partial' | 'unresolved' | 'intentional' | 'obsolete' | 'stale';
export interface CommentMessage { id: string; source: EventSource; body: string; createdAt: string }

export interface ObserverComment {
  id: string;
  issueType: string;
  severity: 'suggestion' | 'warning' | 'blocking';
  summary: string;
  evidence: string;
  suggestedAction: string;
  anchor: TextAnchor;
  status: CommentStatus;
  taskId?: string;
  reviewCount: number;
  messages: CommentMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface StoryFact {
  id: string;
  category: 'character' | 'relationship' | 'timeline' | 'knowledge' | 'foreshadowing' | 'world-rule' | 'promise';
  subject: string;
  statement: string;
  status: FactStatus;
  evidence: Array<{ filePath: string; quote: string; start?: number; end?: number }>;
  updatedAt: string;
}

export interface CanonImpactAnalysis {
  id: string;
  factId: string;
  generatedAt: string;
  previous: Pick<StoryFact, 'category' | 'subject' | 'statement' | 'status'>;
  proposed: Pick<StoryFact, 'category' | 'subject' | 'statement'>;
  affectedChapters: Array<{ filePath: string; matches: string[]; excerpt: string }>;
  affectedPlans: Array<{ filePath: string; matches: string[]; excerpt: string }>;
  relatedFactIds: string[];
  relatedTaskIds: string[];
  warnings: string[];
}

export interface StoryRoute {
  id: string;
  title: string;
  pitch: string;
  effect: string;
  causalChain: string[];
  tradeoffs: string[];
  risks: string[];
  followUpImpact: string;
  requiredSetup: string[];
  firstChapterGoal?: string;
}

export interface NavigationProposal {
  id: string;
  kind: 'opening' | 'routes' | 'guidance';
  status: 'pending' | 'confirmed' | 'rejected';
  title: string;
  diagnosis: string;
  highImpactQuestions: string[];
  recommendedGoal: string;
  routes: StoryRoute[];
  selectedRouteId?: string;
  selectedRouteIds?: string[];
  sourceTaskId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorStyleRule {
  id: string;
  category: 'preference' | 'strength' | 'improvement' | 'boundary' | 'voice';
  text: string;
  status: 'candidate' | 'confirmed' | 'rejected';
  evidence: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthorProfile {
  schemaVersion: number;
  id: string;
  name: string;
  rules: AuthorStyleRule[];
  updatedAt: string;
}

export interface ContinueCard {
  location: string;
  stage: string;
  lastFile?: string;
  goal?: Goal;
  focus: string;
  next: CreativeTask[];
  blockers: CreativeTask[];
  importantComments: ObserverComment[];
}

export interface GitFileStatus { path: string; index: string; workingTree: string; category: ProjectFile['category']; origin: 'pre-existing' | 'author' | 'agent' | 'external' | 'unknown' }
export interface GitStatus { branch: string; ahead: number; behind: number; files: GitFileStatus[]; clean: boolean }
export interface GitDiff { path: string; patch: string; staged: boolean; binary: boolean }
export interface GitFileVersions { path: string; oldContent: string; newContent: string; oldExists: boolean; newExists: boolean; binary: boolean }
export interface RepositoryInfo { root: string; branch: string; remote?: string; head?: string; clean: boolean; changedFiles: number }

export type ManagedContentCategory = 'manuscript' | 'canon' | 'planning' | 'research' | 'decision';
/** `chapter`/`volume` are retained so older local trash indexes remain readable. */
export type TrashKind = 'file' | 'directory' | 'work' | 'chapter' | 'volume';

export interface TrashImpact {
  kind: TrashKind;
  category: ManagedContentCategory;
  path: string;
  title: string;
  files: string[];
  characters: number;
  linkedFacts: number;
  linkedTasks: number;
  linkedComments: number;
  linkedAgents: number;
  warnings: string[];
}

export interface TrashEntry {
  id: string;
  kind: TrashKind;
  category?: ManagedContentCategory;
  originalPath: string;
  trashPath: string;
  title: string;
  files: number;
  characters: number;
  createdAt: string;
  filePaths?: string[];
  work?: { item: ProjectManifest['works'][number]; index: number; wasActive: boolean };
  references?: {
    facts: Array<{ id: string; status: FactStatus }>;
    tasks: Array<{ id: string; status: TaskStatus; whyNow: string; cancellationReason?: string }>;
    comments: Array<{ id: string; status: CommentStatus }>;
  };
}

export interface AgentCapabilities {
  persistentSession: boolean;
  resumeSession: boolean;
  appendMessage: boolean;
  cancel: boolean;
  structuredOutput: boolean;
  fileModification: boolean;
  interAgentMessaging: boolean;
  approvalEvents: boolean;
  usage: boolean;
}

export interface AgentAdapterInfo {
  id: 'codex' | 'claude';
  name: string;
  command: string;
  available: boolean;
  version?: string;
  reason?: string;
  authenticated?: boolean;
  diagnostic?: string;
  checkedAt?: string;
  capabilities: AgentCapabilities;
}

export type AgentTaskState = 'queued' | 'running' | 'awaiting-author' | 'completed' | 'failed' | 'cancelled' | 'interrupted';
export interface AgentVerifiedTextFile {
  path: string;
  totalCharacters: number;
  nonWhitespaceCharacters: number;
  hash: string;
}
export interface AgentTaskRecord {
  id: string;
  adapterId: AgentAdapterInfo['id'];
  role: AgentRole;
  state: AgentTaskState;
  objective: string;
  creativeTaskId?: string;
  scope: string[];
  completionCriteria: string[];
  allowNetwork?: boolean;
  sessionId?: string;
  startedAt: string;
  endedAt?: string;
  startHashes: Record<string, string>;
  changedFiles: string[];
  /** Workbench-computed facts. Never trust an Agent's prose summary for these values. */
  verifiedTextFiles?: AgentVerifiedTextFile[];
  finalMessage?: string;
  error?: string;
}

export interface AgentEvent {
  taskId: string;
  type: 'state' | 'message' | 'command' | 'file-change' | 'approval' | 'error' | 'usage' | 'raw';
  at: string;
  payload: JsonValue;
}

export interface AnalysisSnapshot {
  id: string;
  filePath: string;
  content: string;
  hash: string;
  editorVersion: number;
  selection?: { start: number; end: number };
  createdAt: string;
}

export interface ContextItem { id: string; kind: string; title: string; source: string; content: string; reason: string; characters: number; included: boolean }
export interface ContextPack { id: string; task: string; createdAt: string; budget: number; characters: number; items: ContextItem[]; gaps: string[] }

export interface ProjectState {
  root: string;
  manifest: ProjectManifest;
  files: ProjectFile[];
  goals: Goal[];
  tasks: CreativeTask[];
  comments: ObserverComment[];
  facts: StoryFact[];
  proposals: NavigationProposal[];
  agentTasks: AgentTaskRecord[];
  dataWarnings: string[];
  manuscriptStats: { totalCharacters: number; targetCharacters: number; chapterCount: number; progress: number };
  continueCard: ContinueCard;
  git: GitStatus;
}

export interface FileReadResult { path: string; content: string; hash: string; modifiedAt: string; size: number }
export interface FileWriteRequest { path: string; content: string; expectedHash?: string; createOnly?: boolean; reason?: string }
export interface FileWriteResult extends FileReadResult { conflict?: { diskContent: string; expectedHash: string; actualHash: string } }

export interface AgentRunRequest {
  adapterId: AgentAdapterInfo['id'];
  role: AgentRole;
  objective: string;
  creativeTaskId?: string;
  scope: string[];
  completionCriteria: string[];
  contextPack?: ContextPack;
  allowNetwork?: boolean;
}

export interface ObserverRunRequest {
  adapterId: AgentAdapterInfo['id'];
  snapshot: AnalysisSnapshot;
  contextPack?: ContextPack;
  mode: 'automatic' | 'manual' | 'selection' | 'review' | 'explain';
  commentId?: string;
  question?: string;
}

export interface ProjectCreateInput { root: string; title: string; kind: 'series' | 'novel'; idea?: string; targetCharacters?: number }

export interface WorkbenchApi {
  platform: NodeJS.Platform;
  chooseProject(): Promise<string | null>;
  createProject(input: ProjectCreateInput): Promise<ProjectState>;
  openProject(root: string): Promise<ProjectState>;
  addWork(title: string): Promise<ProjectState>;
  activateWork(workId: string): Promise<ProjectState>;
  refreshProject(): Promise<ProjectState>;
  readFile(path: string): Promise<FileReadResult>;
  searchProject(query: string): Promise<SearchResult[]>;
  writeFile(input: FileWriteRequest): Promise<FileWriteResult>;
  moveFile(input: { from: string; to: string }): Promise<ProjectState>;
  repositoryInfo(): Promise<RepositoryInfo>;
  revealProjectFolder(): Promise<void>;
  copyText(text: string): Promise<void>;
  analyzeTrash(input: { kind: TrashKind; path: string }): Promise<TrashImpact>;
  trashProjectItem(input: { kind: TrashKind; path: string; confirmation: string }): Promise<{ state: ProjectState; entry: TrashEntry }>;
  listTrash(): Promise<TrashEntry[]>;
  restoreTrash(id: string): Promise<ProjectState>;
  trashCurrentProject(input: { confirmation: string }): Promise<void>;
  createRecovery(input: { path: string; content: string; reason: string; sessionEnd?: boolean }): Promise<void>;
  listRecovery(path?: string): Promise<Array<{ id: string; path: string; createdAt: string; reason: string; size: number }>>;
  restoreRecovery(id: string): Promise<FileReadResult>;
  appendEvent(type: string, payload: JsonValue, source?: EventSource): Promise<NovelEvent>;
  gitStatus(): Promise<GitStatus>;
  gitDiff(path?: string, staged?: boolean): Promise<GitDiff[]>;
  gitFileVersions(path: string): Promise<GitFileVersions>;
  gitCommit(input: { message: string; paths: string[]; explicitAuthorization: true }): Promise<{ hash: string; summary: string }>;
  listAgents(): Promise<AgentAdapterInfo[]>;
  runAgent(input: AgentRunRequest): Promise<AgentTaskRecord>;
  runObserver(input: ObserverRunRequest): Promise<AgentTaskRecord>;
  cancelAgent(taskId: string): Promise<void>;
  stopAllAgents(): Promise<void>;
  sendAgentMessage(taskId: string, message: string): Promise<void>;
  createContextPack(input: { task: string; filePath?: string; content?: string; budget?: number }): Promise<ContextPack>;
  observerSession(action: 'start' | 'stop' | 'status'): Promise<{ active: boolean; count: number; budget: number; startedAt?: string }>;
  relocateComments(input: { filePath: string; content: string }): Promise<ObserverComment[]>;
  commentFeedback(input: { commentId: string; action: 'accept' | 'reject' | 'defer' | 'review' | 'explain' | 'intentional' | 'forward'; reason?: string }): Promise<ObserverComment>;
  analyzeCanonImpact(input: { factId: string; category: StoryFact['category']; subject: string; statement: string }): Promise<CanonImpactAnalysis>;
  updateTask(task: Partial<CreativeTask> & { id?: string }): Promise<CreativeTask>;
  updateGoal(goal: Partial<Goal> & { id?: string }): Promise<Goal>;
  decideProposal(input: { proposalId: string; routeId?: string; routeIds?: string[]; combinationNote?: string; decision: 'confirm' | 'reject' }): Promise<NavigationProposal>;
  getAuthorProfile(): Promise<AuthorProfile>;
  upsertStyleRule(rule: Partial<AuthorStyleRule> & { id?: string }): Promise<AuthorProfile>;
  deleteStyleRule(id: string): Promise<AuthorProfile>;
  exportAuthorProfile(): Promise<string | null>;
  importAuthorProfile(): Promise<AuthorProfile | null>;
  getSettings(): Promise<Settings>;
  updateSettings(settings: Partial<Settings>): Promise<Settings>;
  getRecentProject(): Promise<string | null>;
  updateBufferState(input: { path: string; dirty: boolean; hash: string; content?: string }): Promise<void>;
  onAgentEvent(listener: (event: AgentEvent) => void): () => void;
  onExternalFileChange(listener: (change: { path: string; hash: string; content: string }) => void): () => void;
  onProjectChange(listener: () => void): () => void;
}
