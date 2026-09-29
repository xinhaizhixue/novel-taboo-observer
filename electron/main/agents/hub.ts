import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { appendFile, chmod, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { createPatch } from 'diff';
import type { AgentAdapterInfo, AgentEvent, AgentRunRequest, AgentTaskRecord, NavigationProposal, ObserverComment, ObserverRunRequest, StoryRoute } from '../../../src/shared/types.js';
import { ProjectService } from '../project.js';
import { AuthorProfileStore } from '../profile.js';
import { makeAnchor } from '../observer.js';
import { atomicWrite, exec, hashText, now, uid, writeJson } from '../utils.js';
import type { AdapterRunOptions, AgentAdapter } from './adapter.js';
import { ClaudeAdapter } from './claude.js';
import { CodexAdapter } from './codex.js';
import { COLD_READING_SCHEMA, coldReadingPrompt, NAVIGATION_SCHEMA, OBSERVER_SCHEMA, STYLE_SCHEMA, observerPrompt, taskPrompt } from './prompts.js';

import { compareNaturalPath } from '../../../src/shared/natural-sort.js';
import { ContextAssembler } from '../context.js';
import { addReviewReferences, buildReviewBundle, finishReview, pendingReview, validateReviewQuotes, writerReviewOutcome } from '../literary-review.js';
import type { ReviewReport } from '../../../src/shared/types.js';
import { signalAgent } from './terminate.js';
import { withDeadline } from '../shutdown.js';
import { normalizeReviewQuotes } from '../review-quotes.js';

interface ActiveTask {
  cancellation?: Promise<void>;
  process: ChildProcessWithoutNullStreams;
  record: AgentTaskRecord;
  adapter: AgentAdapter;
  settled: Promise<void>;
  sessionPersistence: Promise<void>;
}

function parseObject(value: string) {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(trimmed) as Record<string, unknown>; } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    throw new Error('Agent 未返回可解析的结构化结果');
  }
}

function allowedPath(file: string, scope: string[]) {
  return scope.some((item) => file === item || file.startsWith(`${item.replace(/\/$/, '')}/`));
}

export function scopesOverlap(left: string[], right: string[]) {
  const normalize = (value: string) => value.replace(/^\.\//, '').replace(/\/$/, '');
  return left.some((a) => right.some((b) => {
    const first = normalize(a); const second = normalize(b);
    return first === second || first.startsWith(`${second}/`) || second.startsWith(`${first}/`);
  }));
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function adapterFailure(exitCode: number, raw: string[]) {
  const output = raw.join('\n');
  if (/model requires a newer version of Codex/i.test(output)) return '当前 Codex CLI 版本过旧，无法运行已配置的模型。请升级 CLI，或通过 NOVEL_OBSERVER_CODEX_PATH 指定已安装的新版 Codex；工作台未自动切换模型。';
  if (/failed to refresh available models:\s*timeout waiting for child process to exit|Codex 启动时刷新可用模型失败/i.test(output)) return 'Codex 启动时刷新可用模型失败；本次任务尚未执行。请确认 Codex 客户端的网络和模型可用后重试。';
  if (/Agent 启动超过 \d+ 秒仍没有模型输出/i.test(output) || exitCode === 124) return 'Agent 启动后长时间没有模型输出，工作台已停止本次任务；正文没有被自动重跑，请检查 Agent 状态后重试。';
  if (/readonly database|attempt to write a readonly database/i.test(output)) return 'Codex 的运行状态目录不可写；请检查 Agent 自己的安装目录权限。';
  if (/not logged in|authentication|unauthorized|login required/i.test(output)) return 'Agent 尚未登录或登录已失效，请先在 Agent 自己的客户端重新登录。';
  if (/operation not permitted/i.test(output)) return '系统拒绝 Agent 初始化或创建子进程；请检查 macOS 权限与运行环境。';
  return `Agent 退出码 ${exitCode}`;
}

function reasoningEffortFor(role: AgentTaskRecord['role']): 'low' | 'medium' | 'high' {
  if (['observer', 'memory-curator', 'style-coach'].includes(role)) return 'low';
  if (['writer', 'researcher', 'release-assistant'].includes(role)) return 'medium';
  return 'high';
}

export class AgentHub {
  onWriterCompleted?: (record: AgentTaskRecord) => void;

  async waitForTask(taskId: string) { await this.active.get(taskId)?.settled; }
  async waitForReviews() { await Promise.all([...this.active.values()].filter((task) => task.record.role === 'observer').map((task) => task.settled.catch(() => {}))); }
  private readonly adapters: Map<AgentAdapterInfo['id'], AgentAdapter>;
  private readonly active = new Map<string, ActiveTask>();
  private readonly startingWriters = new Map<string, string[]>();
  private readonly records = new Map<string, AgentTaskRecord>();
  private readonly listeners = new Set<(event: AgentEvent) => void>();

  constructor(private readonly appData: string, private readonly project: ProjectService, private readonly profile: AuthorProfileStore, adapters: AgentAdapter[] = [new CodexAdapter(), new ClaudeAdapter(), new CodexAdapter(process.env.NOVEL_OBSERVER_TRAEX_PATH || 'traex', false, undefined, 'traex')]) {
    this.adapters = new Map(adapters.map((adapter) => [adapter.id, adapter]));
  }

  subscribe(listener: (event: AgentEvent) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  get hasActiveTasks() { return this.active.size > 0 || this.startingWriters.size > 0; }
  async record(taskId: string) {
    const cached = this.records.get(taskId);
    if (cached) return cached;
    const restored = (await this.project.state()).agentTasks.find((item) => item.id === taskId);
    if (restored) this.records.set(taskId, restored);
    return restored;
  }
  async reconcileInterrupted() {
    const state = await this.project.state();
    for (const record of state.agentTasks.filter((item) => item.state === 'running' || item.state === 'queued')) {
      if (this.active.has(record.id)) continue;
      const interrupted: AgentTaskRecord = { ...record, state: 'interrupted', endedAt: now(), error: '应用或 Agent 会话在任务完成前中断；工作台不会自动重跑，请先检查现有 diff。' };
      this.records.set(interrupted.id, interrupted);
      await this.project.eventStore.append('agent.task', interrupted as never, 'system');
      await this.syncCreativeTask(interrupted);
    }
    for (const report of (state.reviews ?? []).filter((item) => item.status === 'running')) {
      if (this.active.has(report.taskId)) continue;
      const summary = '上次审阅在形成完整结论前中断；本次未自动重跑，请按当前版本重新审阅。';
      const interrupted: ReviewReport = {
        ...report, status: 'failed', completedAt: now(), summary,
        gaps: [...new Set([...report.gaps, '审阅没有存活的执行任务，未获得完整结论。'])]
      };
      await this.project.eventStore.append('review.report', interrupted as never, 'system');
    }
  }
  private emit(event: AgentEvent) { for (const listener of this.listeners) listener(event); }
  async list() { return Promise.all([...this.adapters.values()].map((adapter) => adapter.info())); }

  private async verifiedTextFiles(files: string[]) {
    const verified = [];
    for (const file of [...new Set(files)]) {
      try {
        const read = await this.project.readFile(file);
        verified.push({
          path: file,
          totalCharacters: read.content.length,
          nonWhitespaceCharacters: read.content.replace(/\s/g, '').length,
          hash: read.hash
        });
      } catch { /* Deleted or unsupported paths remain visible in changedFiles. */ }
    }
    return verified;
  }

  private reserveWriter(taskId: string, scope: string[], ignoreTaskId?: string) {
    const activeCollision = [...this.active.entries()].find(([id, item]) => id !== ignoreTaskId && item.record.role === 'writer' && scopesOverlap(scope, item.record.scope));
    const startingCollision = [...this.startingWriters.entries()].find(([id, item]) => id !== ignoreTaskId && scopesOverlap(scope, item));
    const collision = activeCollision?.[1].record ?? (startingCollision ? { id: startingCollision[0], objective: '正在启动的 Writer' } : undefined);
    if (collision) throw new Error(`Writer 已在重叠范围工作（${collision.objective}）。请等待完成或先停止任务，避免两个 Agent 同时改写正文。`);
    this.startingWriters.set(taskId, scope);
  }

  private async guardedEnvironment() {
    if (process.platform === 'win32') return { ...process.env, GIT_TERMINAL_PROMPT: '0' };
    const directory = path.join(this.appData, 'agent-guard', 'bin');
    await mkdir(directory, { recursive: true });
    const target = path.join(directory, 'git');
    const realGit = (await exec('/usr/bin/which', ['git'])).stdout.trim() || '/usr/bin/git';
    const quoted = realGit.replaceAll("'", "'\\''");
    const script = `#!/bin/sh\ncommand_name=""\nexpect_value=0\nfor arg in "$@"; do\n  if [ "$expect_value" = "1" ]; then expect_value=0; continue; fi\n  case "$arg" in\n    -C|-c|--git-dir|--work-tree|--namespace) expect_value=1 ;;\n    -*) ;;\n    *) command_name="$arg"; break ;;\n  esac\ndone\ncase "$command_name" in\n  status|diff|log|show|rev-parse|ls-files|ls-tree|cat-file|blame|grep|describe|name-rev|merge-base|for-each-ref|show-ref) exec '${quoted}' "$@" ;;\n  *)\n    echo "禁忌观察者：Agent 只允许 Git 只读查询；写操作须由作者在工作台明确授权。" >&2\n    exit 77\n    ;;\nesac\n`;
    await atomicWrite(target, script);
    await chmod(target, 0o755);
    return { ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH || ''}`, GIT_TERMINAL_PROMPT: '0' };
  }

  async runTask(input: AgentRunRequest) {
    if (input.role === 'researcher' && input.scope.some((item) => item !== 'research' && !item.startsWith('research/'))) throw new Error('Researcher 只允许写入 research/ 范围');
    const structured = ['navigator', 'architect'].includes(input.role) ? 'navigation' : ['memory-curator', 'style-coach'].includes(input.role) ? 'style' : undefined;
    return this.start(input, taskPrompt(input), !['writer', 'researcher'].includes(input.role), undefined, structured);
  }

  private async waitForConcurrentWriters(taskId: string) {
    const running = () => [...this.active.entries()].some(([id, task]) => id !== taskId && task.record.role === 'writer');
    if (!running()) return;
    this.emit({ taskId, type: 'message', at: now(), payload: '审读已返回，正在等待同期 Writer 结束，以核对正文改动归属。' });
    while (running() && this.active.get(taskId)?.record.state !== 'cancelled') await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private async writerComparison(writer: AgentTaskRecord) {
    const pieces: string[] = [];
    let remaining = 40_000;
    for (const filePath of writer.changedFiles) {
      const hash = writer.startHashes[filePath];
      if (!hash || hash === 'missing') { pieces.push(`${filePath}：新文件，没有改前正文。`); continue; }
      try {
        const blob = path.join(this.appData, 'recovery', this.project.activeManifest.projectId, 'blobs', `${hash}.gz`);
        const before = (await promisify(gunzip)(await readFile(blob))).toString('utf8');
        if (hashText(before) !== hash) throw new Error('恢复副本与任务基线不匹配');
        const after = await this.project.readFile(filePath);
        const difference = createPatch(filePath, before, after.content, 'Writer开始前', '当前正文', { context: 2 });
        const part = difference.slice(0, Math.max(0, remaining));
        pieces.push(part + (part.length < difference.length ? '\n[差异预算不足，后部省略；不得据此断言全部要求已完成]' : ''));
        remaining -= part.length;
      } catch { pieces.push(`${filePath}：改前版本不可用，不能验证改写是否充分。`); }
    }
    return pieces.join('\n');
  }

  async runObserver(input: ObserverRunRequest) {
    input = { ...input, quoteNormalizations: [] };
    if (input.sourceWriterTaskId) {
      const writer = await this.record(input.sourceWriterTaskId);
      if (writer?.role === 'writer') input = { ...input, writingRequirements: `${writer.objective}\n完成条件：${writer.completionCriteria.join('；')}`, writingComparison: await this.writerComparison(writer) };
    }
    // Rebuild evidence in the trusted backend; never trust caller-supplied coverage.
    input = { ...input, bundle: await buildReviewBundle(this.project, input), reportId: input.mode === 'explain' ? undefined : uid('review') };
    if (!input.contextPack) input.contextPack = await new ContextAssembler(this.project).build({ task: '逐项文学审阅：人物、语言与连续性', filePath: input.snapshot.filePath, content: input.snapshot.content, budget: 20_000 });
    if (input.contextPack) {
      const items = input.contextPack.items.filter((item) => !['manuscript', 'current-buffer'].includes(item.kind));
      input.contextPack = { ...input.contextPack, items, characters: items.filter((item) => item.included).reduce((sum, item) => sum + item.characters, 0) };
    }
    const run: AgentRunRequest = { model: input.model, reasoningEffort: input.reasoningEffort, adapterId: input.adapterId, role: 'observer', objective: `${input.bundle!.scope === 'sequence' ? '联合审阅' : '逐项精读'} ${input.snapshot.filePath}`, scope: input.bundle!.sources.map((source) => source.filePath), completionCriteria: ['完成六个维度的有证据审阅；缺项、失效或未定位意见不能宣布通过'], contextPack: input.contextPack };
    try { return await this.start(run, observerPrompt(input), true, input); }
    catch (error) {
      if (input.reportId) await this.project.eventStore.append('review.report', { ...pendingReview(input, ''), status: 'failed', completedAt: now(), summary: String(error) } as never, 'observer');
      throw error;
    }
  }

  private async start(input: AgentRunRequest, prompt: string, readOnly: boolean, observer?: ObserverRunRequest, structured?: 'navigation' | 'style') {
    const id = uid('agent-task');
    if (observer?.reportId) await this.project.eventStore.append('review.report', pendingReview(observer, id) as never, 'observer');
    const duplicate = [...this.active.values()].find((item) => item.record.role === input.role && (input.role === 'observer' || item.record.objective.trim() === input.objective.trim()) && scopesOverlap(item.record.scope, input.scope));
    if (duplicate) throw new Error(`相同的 ${input.role} 任务已经在运行，请等待完成或先停止，避免重复消耗。`);
    if (input.role === 'writer') this.reserveWriter(id, input.scope);
    try {
    const adapter = this.adapters.get(input.adapterId);
    if (!adapter) throw new Error(`未知 Agent 适配器：${input.adapterId}`);
    const info = await adapter.info();
    if (!info.available) throw new Error(info.reason || `${info.name} 当前不可用`);
    const authorRevision = this.project.authorEditRevision;
    const startFiles = (await this.project.files()).map((file) => file.path);
    const baselineHashes = await this.project.hashFiles(startFiles);
    const persistedStartHashes = readOnly ? {} : Object.fromEntries(Object.entries(baselineHashes).filter(([file]) => allowedPath(file, input.scope)));
    const reasoningEffort = input.reasoningEffort ?? (observer ? observer.reviewScope === 'sequence' ? 'high' : 'medium' : reasoningEffortFor(input.role));
    const record: AgentTaskRecord = { model: input.model, reasoningEffort, id, adapterId: input.adapterId, role: input.role, state: 'running', objective: input.objective, creativeTaskId: input.creativeTaskId, scope: input.scope, completionCriteria: input.completionCriteria, allowNetwork: input.allowNetwork, startedAt: now(), startHashes: persistedStartHashes, changedFiles: [] };
    const directory = path.join(this.appData, 'agents', this.project.activeManifest.projectId, id);
    await mkdir(directory, { recursive: true });
    const outputPath = path.join(directory, 'final.txt');
    const rawLogPath = path.join(directory, 'events.jsonl');
    await atomicWrite(rawLogPath, '');
    let rawLogQueue = Promise.resolve();
    let streamedRaw = false;
    const recordRaw = (line: string) => { streamedRaw = true; rawLogQueue = rawLogQueue.then(() => appendFile(rawLogPath, line.endsWith('\n') ? line : `${line}\n`, 'utf8')).catch(() => {}); };
    let schemaPath: string | undefined;
    if (observer || structured) {
      schemaPath = path.join(directory, 'schema.json');
      await writeJson(schemaPath, observer ? OBSERVER_SCHEMA : structured === 'navigation' ? NAVIGATION_SCHEMA : STYLE_SCHEMA);
    }
    await this.project.eventStore.append('agent.task', record as never, input.role === 'observer' ? 'observer' : 'agent');
    const isolatedReadOnly = ['observer', 'memory-curator', 'style-coach'].includes(input.role);
    let sessionPersistence = Promise.resolve();
    let activeTask: ActiveTask | undefined;
    const onSessionId = (sessionId: string) => {
      if (record.sessionId === sessionId) return;
      record.sessionId = sessionId;
      const snapshot: AgentTaskRecord = { ...record, startHashes: { ...record.startHashes }, changedFiles: [...record.changedFiles] };
      sessionPersistence = sessionPersistence.then(() => this.project.eventStore.append('agent.task', snapshot as never, input.role === 'observer' ? 'observer' : 'agent')).then(() => undefined).catch((error: Error) => {
        this.emit({ taskId: id, type: 'error', at: now(), payload: `会话恢复标识保存失败：${error.message}` });
      });
      if (activeTask) activeTask.sessionPersistence = sessionPersistence;
      this.emit({ taskId: id, type: 'state', at: now(), payload: { state: record.state, role: record.role, sessionId, phase: 'connected' } });
    };
    const runOptions: AdapterRunOptions = { model: input.model, taskId: id, root: this.project.activeRoot, prompt, readOnly, schemaPath, outputPath, env: await this.guardedEnvironment(), startupTimeoutMs: ['writer', 'researcher'].includes(input.role) ? 300_000 : 180_000, reasoningEffort, ignoreUserConfig: isolatedReadOnly, networkAccess: Boolean(input.allowNetwork), recordRaw, onSessionId, emit: (event) => this.emit(event) };
    const twoPass = observer && observer.mode !== 'explain';
    let firstOptions = runOptions;
    if (twoPass) {
      const readingRoot = path.join(directory, 'reading'); await mkdir(readingRoot, { recursive: true });
      const readingSchema = path.join(directory, 'reading-schema.json'); await writeJson(readingSchema, COLD_READING_SCHEMA);
      firstOptions = { ...runOptions, root: readingRoot, prompt: coldReadingPrompt(observer), pureText: true, schemaPath: readingSchema, outputPath: path.join(directory, 'reading.txt') };
    }
    const run = adapter.run(firstOptions);

    activeTask = { process: run.process, record, adapter, settled: Promise.resolve(), sessionPersistence };
    this.active.set(id, activeTask);
    this.startingWriters.delete(id);
    this.records.set(id, record);
    this.emit({ taskId: id, type: 'state', at: now(), payload: { state: 'running', role: input.role } });
    const completed = run.completed.then(async (first) => {
      if (!twoPass || first.exitCode !== 0 || record.state === 'cancelled') return first;
      const originalReading = parseObject(first.finalMessage);
      await writeJson(path.join(directory, 'cold-reading-original.json'), originalReading);
      const normalizedReading = normalizeReviewQuotes(originalReading, observer.bundle!.sources, 'reading');
      const reading = normalizedReading.value as unknown as import('../../../src/shared/types.js').ColdReading;
      observer.quoteNormalizations = normalizedReading.normalizations;
      for (const source of observer.bundle!.sources) {
        const rows = reading.readings?.filter(row => row.filePath === source.filePath);
        if (rows?.length !== 1 || !rows[0].quote?.trim() || !source.content.includes(rows[0].quote) || !rows[0].understanding?.trim() || !Array.isArray(rows[0].frictions) || rows[0].frictions.some(item => !item.quote?.trim() || !source.content.includes(item.quote) || !item.difficulty?.trim() || !item.suggestion?.trim())) throw new Error('第一遍正文阅读记录缺失或引文不匹配，不能宣布审查完成。');
      }
      observer.coldReading = reading;
      await writeJson(path.join(directory, 'cold-reading.json'), reading);
      await this.project.eventStore.append('review.report', { ...pendingReview(observer, id), coldReading: reading, summary: '独立正文阅读已完成，正在结合上下文复核。' } as never, 'observer');
      if (this.active.get(id)?.record.state === 'cancelled') return { ...first, exitCode: 143 };
      this.emit({ taskId: id, type: 'message', at: now(), payload: '第一遍正文阅读已保存，开始第二遍上下文审查。' });
      const second = adapter.run({ ...runOptions, prompt: observerPrompt(observer) + '\n输出 JSON Schema：' + JSON.stringify(OBSERVER_SCHEMA) });
      activeTask!.process = second.process;
      const result = await second.completed;
      return { ...result, raw: [...first.raw, ...result.raw] };
    });
    const settled = completed.then(async (result) => {
      if (readOnly) await this.waitForConcurrentWriters(id);
      await sessionPersistence;
      record.sessionId = result.sessionId;
      record.finalMessage = result.finalMessage.trim();
      record.endedAt = now();
      const endFiles = (await this.project.files()).map((file) => file.path);
      const endHashes = await this.project.hashFiles([...new Set([...startFiles, ...endFiles])]);
      const observedChanges = Object.keys(endHashes).filter((file) => endHashes[file] !== baselineHashes[file]);
      record.concurrentAuthorFiles = observedChanges.filter((file) => this.project.isAuthorEditSince(file, endHashes[file], authorRevision));
      record.concurrentAgentFiles = observedChanges.filter((file) => this.project.isOtherAgentEditSince(id, file, endHashes[file], authorRevision));
      record.changedFiles = observedChanges.filter((file) => !record.concurrentAuthorFiles!.includes(file) && !record.concurrentAgentFiles!.includes(file));
      record.verifiedTextFiles = await this.verifiedTextFiles(record.changedFiles);
      const unauthorized = readOnly ? record.changedFiles : record.changedFiles.filter((file) => !allowedPath(file, input.scope));
      if (record.state === 'cancelled') {
        // Keep author cancellation even if the CLI exits zero or is force-killed.
      } else if (result.exitCode !== 0) {
        record.state = result.exitCode === 143 ? 'cancelled' : 'failed';
        record.error = result.exitCode === 143 ? record.error || '作者停止了任务；已有文件变化已保留供检查。' : adapterFailure(result.exitCode, result.raw);
      } else if (unauthorized.length) {
        record.state = 'awaiting-author';
        record.error = `检测到授权范围外的文件变化：${unauthorized.join('、')}。工作台没有自动回滚，以免覆盖并发修改。`;
      } else record.state = 'completed';
      await rawLogQueue;
      if (!streamedRaw) await atomicWrite(rawLogPath, `${result.raw.join('\n')}\n`);
      if (observer && result.exitCode === 0 && record.state === 'completed') await this.acceptObserverResult(observer, record.finalMessage || '{}', id, baselineHashes).catch((error) => { record.state = 'failed'; record.error = (error as Error).message; });
      if (structured === 'navigation' && result.exitCode === 0 && record.state === 'completed') await this.acceptNavigationResult(input, record, record.finalMessage || '{}').catch((error) => { record.state = 'failed'; record.error = (error as Error).message; });
      if (structured === 'style' && result.exitCode === 0 && record.state === 'completed') await this.acceptStyleResult(record.finalMessage || '{}').catch((error) => { record.state = 'failed'; record.error = (error as Error).message; });
      if (record.role === 'writer') this.project.recordAgentEdits(id, Object.fromEntries(record.changedFiles.filter((file) => allowedPath(file, input.scope)).map((file) => [file, endHashes[file]])));
      if (observer?.reportId && record.state !== 'completed') await this.project.eventStore.append('review.report', { ...pendingReview(observer, id), status: record.state === 'cancelled' ? 'cancelled' : 'failed', completedAt: now(), summary: record.error || '审阅未完成。' } as never, 'observer');
      await this.project.eventStore.append('agent.task', record as never, input.role === 'observer' ? 'observer' : 'agent');
      await this.syncCreativeTask(record);
      await this.syncProjectPosition(record);
      this.active.delete(id);
      if (record.state === 'completed' && record.role === 'writer') this.onWriterCompleted?.(record);
      this.emit({ taskId: id, type: record.state === 'failed' ? 'error' : 'state', at: now(), payload: { state: record.state, role: record.role, changedFiles: record.changedFiles, error: record.error ?? null } });
    }).catch(async (error: Error) => {
      await sessionPersistence;
      record.state = 'failed'; record.error = error.message; record.endedAt = now();
      await this.project.eventStore.append('agent.task', record as never, 'agent');
      await this.syncCreativeTask(record);
      this.active.delete(id);
      this.emit({ taskId: id, type: 'error', at: now(), payload: error.message });
    });
    activeTask.settled = settled;
    void settled.catch((error) => console.error('Agent finalization failed:', error));
    return record;
    } finally {
      this.startingWriters.delete(id);
    }
  }

  private async acceptNavigationResult(input: AgentRunRequest, record: AgentTaskRecord, message: string) {
    const parsed = parseObject(message);
    const rawRoutes = Array.isArray(parsed.routes) ? parsed.routes as Array<Record<string, unknown>> : [];
    if (rawRoutes.length < 2) throw new Error('Navigator 未返回至少两条可比较路线');
    const routes: StoryRoute[] = rawRoutes.slice(0, 4).map((item) => ({
      id: uid('route'), title: String(item.title ?? '未命名路线'), pitch: String(item.pitch ?? ''), effect: String(item.effect ?? ''),
      causalChain: strings(item.causalChain), tradeoffs: strings(item.tradeoffs), risks: strings(item.risks),
      followUpImpact: String(item.followUpImpact ?? ''), requiredSetup: strings(item.requiredSetup), firstChapterGoal: String(item.firstChapterGoal ?? '') || undefined
    }));
    const state = await this.project.state();
    const stage = state.continueCard.stage;
    const proposal: NavigationProposal = {
      id: uid('proposal'), kind: input.role === 'architect' ? 'routes' : stage.includes('灵感') || stage.includes('开书') ? 'opening' : 'guidance', status: 'pending',
      title: String(parsed.title ?? '下一步剧情路线'), diagnosis: String(parsed.diagnosis ?? ''), highImpactQuestions: strings(parsed.highImpactQuestions).slice(0, 3),
      recommendedGoal: String(parsed.recommendedGoal ?? ''), planningScope: input.navigationScope === 'work' ? 'work' : undefined, routes, sourceTaskId: record.id, createdAt: now(), updatedAt: now()
    };
    await this.project.eventStore.append('proposal.created', proposal as never, 'navigator');
  }

  private async acceptStyleResult(message: string) {
    const parsed = parseObject(message);
    const rawRules = Array.isArray(parsed.rules) ? parsed.rules as Array<Record<string, unknown>> : [];
    const validCategories = new Set(['preference', 'strength', 'improvement', 'boundary', 'voice']);
    let profile = await this.profile.get();
    for (const item of rawRules) {
      const category = String(item.category ?? 'preference');
      const evidence = strings(item.evidence);
      if (!validCategories.has(category) || !String(item.text ?? '').trim() || evidence.length < 2) continue;
      profile = await this.profile.upsert({ category: category as 'preference' | 'strength' | 'improvement' | 'boundary' | 'voice', text: String(item.text), status: 'candidate', evidence });
    }
    await this.project.linkAuthorProfile(profile);
  }

  private async syncCreativeTask(record: AgentTaskRecord) {
    if (!record.creativeTaskId) return;
    const task = (await this.project.state()).tasks.find((item) => item.id === record.creativeTaskId);
    if (!task) return;
    const waitingForReview = record.state === 'completed' && record.role === 'writer';
    const completed = record.state === 'completed' && !['writer', 'navigator', 'architect'].includes(record.role);
    const updated = {
      ...task,
      status: completed ? 'completed' as const : waitingForReview ? 'now' as const : 'blocked' as const,
      whyNow: task.whyNow,
      agentWork: waitingForReview ? `Writer已交付正文，尚待文学审阅与写作要求核对。\n${record.finalMessage || ''}` : record.finalMessage || record.error || task.agentWork,
      links: [...new Set([...task.links, ...record.changedFiles])],
      updatedAt: now(),
      cancellationReason: completed || waitingForReview ? undefined : ['cancelled', 'failed', 'interrupted'].includes(record.state) ? record.error || `Agent ${record.state}` : task.cancellationReason
    };
    await this.project.eventStore.append('task.upsert', updated as never, 'agent');
  }

  private async syncProjectPosition(record: AgentTaskRecord) {
    if (record.state !== 'completed' || record.role !== 'writer') return;
    const manuscriptRoots = this.project.activeManifest.works.map((work) => work.manuscriptRoot.replace(/\/$/, ''));
    const filePath = [...record.changedFiles].sort(compareNaturalPath).reverse().find((file) => manuscriptRoots.some((root) => file === root || file.startsWith(`${root}/`)));
    if (!filePath) return;
    await this.project.markWorkSerializing(filePath);
    const workRoot = manuscriptRoots.find((root) => filePath === root || filePath.startsWith(`${root}/`));
    const lastPosition = (await this.project.eventStore.all()).filter((event) => event.type === 'project.position').at(-1);
    const lastFile = String((lastPosition?.payload as Record<string, unknown> | undefined)?.filePath || '');
    if (workRoot && lastFile && (lastFile === workRoot || lastFile.startsWith(`${workRoot}/`)) && compareNaturalPath(lastFile, filePath) > 0) return;
    const chapter = path.basename(filePath).replace(/\.(?:md|markdown|txt)$/i, '');
    await this.project.eventStore.append('project.position', {
      filePath,
      stage: '逐章创作、观察和修订',
      focus: `审查${chapter}并推进下一章`
    }, 'agent');
  }

  private async settleWriterTask(writerId: string) {
    const writer = await this.record(writerId);
    if (!writer?.creativeTaskId) return;
    const state = await this.project.state();
    const task = state.tasks.find((item) => item.id === writer.creativeTaskId);
    if (!task) return;
    const files = writer.changedFiles.filter((file) => state.files.some((item) => item.path === file && item.category === 'manuscript'));
    const result = writerReviewOutcome(writerId, files, state.reviews ?? []);
    await this.project.eventStore.append('task.upsert', { ...task, status: result.complete ? 'completed' : 'blocked', agentWork: result.complete ? '当前版本的文学审阅与写作要求核对已完成。' : `文学审阅仍有意见或缺口，待完成：${result.missing.join('、')}`, updatedAt: now(), cancellationReason: undefined } as never, 'observer');
  }

  private async acceptObserverResult(input: ObserverRunRequest, message: string, taskId: string, baselineHashes: Record<string, string>) {
    let parsed = parseObject(message);
    if (input.mode === 'explain' && input.commentId) {
      const state = await this.project.state();
      const original = state.comments.find((item) => item.id === input.commentId);
      if (original) {
        const timestamp = now();
        const updated: ObserverComment = { ...original, updatedAt: timestamp, messages: [...original.messages, { id: uid('msg'), source: 'observer', body: String(parsed.summary ?? '当前没有更多解释。'), createdAt: timestamp }] };
        await this.project.eventStore.append('comment.updated', updated as never, 'observer');
      }
      return;
    }
    await addReviewReferences(this.project, input.bundle!, parsed, baselineHashes);
    const normalizedQuotes = normalizeReviewQuotes(parsed, input.bundle!.sources, 'context');
    parsed = normalizedQuotes.value;
    input.quoteNormalizations = [...(input.quoteNormalizations ?? []), ...normalizedQuotes.normalizations];
    const proposed = Array.isArray(parsed.comments) ? parsed.comments as Array<Record<string, unknown>> : [];
    const timestamp = now();
    const created: ObserverComment[] = [];
    const commentIds: string[] = [];
    const unanchored: ReviewReport['unanchored'] = [];
    const existingComments = input.mode === 'review' ? [] : [...(await this.project.state()).comments];
    const reusableStatuses = new Set<ObserverComment['status']>(['open', 'accepted', 'deferred', 'review-requested', 'partial', 'unresolved', 'intentional']);
    for (const item of proposed) {
      const normalized = { ...item, filePath: item.filePath || input.snapshot.filePath };
      const checked = validateReviewQuotes(input.bundle!, normalized);
      const source = checked.source;
      const anchor = !checked.reason && source ? makeAnchor(source.filePath, source.content, source.id, source.hash, { quote: String(item.quote ?? ''), start: Number(item.start ?? 0), end: Number(item.end ?? 0) }) : null;
      if (!anchor) { unanchored.push({ filePath: String(normalized.filePath), quote: String(item.quote ?? ''), summary: String(item.summary ?? ''), reason: checked.reason || '无法定位正文。' }); continue; }
      const summary = String(item.summary ?? '');
      const issueType = String(item.issueType ?? '写作建议');
      const existing = existingComments.find((comment) => reusableStatuses.has(comment.status) && comment.anchor.filePath === anchor.filePath && comment.anchor.quote === anchor.quote && (comment.summary === summary || comment.issueType === issueType));
      if (existing) {
        const repeated = '再次检查仍发现同一问题。';
        const updated: ObserverComment = {
          ...existing,
          issueType,
          severity: ['suggestion', 'warning', 'blocking'].includes(String(item.severity)) ? item.severity as ObserverComment['severity'] : existing.severity,
          evidence: String(item.evidence ?? existing.evidence),
          suggestedAction: String(item.suggestedAction ?? existing.suggestedAction),
          anchor,
          updatedAt: timestamp,
          messages: existing.messages.at(-1)?.body === repeated ? existing.messages : [...existing.messages, { id: uid('msg'), source: 'observer', body: repeated, createdAt: timestamp }]
        };
        await this.project.eventStore.append('comment.updated', updated as never, 'observer');
        commentIds.push(updated.id);
        const index = existingComments.findIndex((comment) => comment.id === existing.id);
        if (index >= 0) existingComments[index] = updated;
        continue;
      }
      const comment: ObserverComment = {
        id: uid('OBS'), taskId, issueType, severity: ['suggestion', 'warning', 'blocking'].includes(String(item.severity)) ? item.severity as ObserverComment['severity'] : 'suggestion',
        summary, evidence: String(item.evidence ?? ''), suggestedAction: String(item.suggestedAction ?? ''), anchor, status: 'open', reviewCount: input.mode === 'review' ? 1 : 0, messages: [{ id: uid('msg'), source: 'observer', body: summary, createdAt: timestamp }], createdAt: timestamp, updatedAt: timestamp
      };
      created.push(comment);
      commentIds.push(comment.id);
      existingComments.push(comment);
      await this.project.eventStore.append('comment.created', comment as never, 'observer');
    }
    const report = input.reportId ? finishReview(pendingReview(input, taskId), input.bundle!, parsed, commentIds, unanchored) : undefined;
    if (report) {
      await this.project.eventStore.append('review.report', report as never, 'observer');
      if (input.sourceWriterTaskId) await this.settleWriterTask(input.sourceWriterTaskId);
    }
    if (input.mode === 'review' && input.commentId) {
      const state = await this.project.state();
      const original = state.comments.find((item) => item.id === input.commentId);
      if (original) {
        const proposedResult = String(parsed.reviewResult ?? '');
        let result: ObserverComment['status'] = ['resolved', 'partial', 'unresolved', 'obsolete'].includes(proposedResult) ? proposedResult as ObserverComment['status'] : created.length ? 'partial' : 'unresolved';
        if (report?.status === 'incomplete' && result === 'resolved') result = 'unresolved';
        const labels: Partial<Record<ObserverComment['status'], string>> = { resolved: '复查通过：原问题已解决。', partial: '复查结果：问题部分解决，相关意见已重新锚定。', unresolved: '复查结果：问题尚未解决。', obsolete: '复查结果：剧情变化使原建议失效。' };
        const updated: ObserverComment = { ...original, status: result, reviewCount: original.reviewCount + 1, updatedAt: timestamp, messages: [...original.messages, { id: uid('msg'), source: 'observer', body: labels[result] || '复查已完成。', createdAt: timestamp }] };
        await this.project.eventStore.append('comment.updated', updated as never, 'observer');
      }
    }
  }

  async cancel(taskId: string) {
    const task = this.active.get(taskId);
    if (!task) throw new Error('任务已经结束或不存在');
    if (task.cancellation) return task.cancellation;
    task.record.state = 'cancelled'; task.record.endedAt = now(); task.record.error = '作者停止了任务；已有文件变化已保留供检查。';
    // Signal before persistence: a slow disk must not leave the Writer running.
    signalAgent(task.process, 'SIGTERM');
    task.cancellation = (async () => {
      try { await withDeadline(task.settled, 3_000, 'Agent 未响应停止请求'); }
      catch {
        signalAgent(task.process, 'SIGKILL');
        await withDeadline(task.settled, 2_000, 'Agent 已强制停止，结束记录尚未完成');
      }
    })();
    return task.cancellation;
  }

  forceStopAll() {
    for (const task of this.active.values()) {
      try { signalAgent(task.process, 'SIGKILL'); }
      catch (error) { console.warn('Agent could not be killed:', error); }
    }
  }

  async cancelAll() { await Promise.all([...this.active.keys()].map((id) => this.cancel(id))); }

  async sendMessage(taskId: string, message: string, overrides?: Pick<AgentRunRequest, 'model' | 'reasoningEffort'>) {
    const record = await this.record(taskId);
    if (!record) throw new Error('找不到 Agent 任务');
    if (this.active.has(taskId)) throw new Error('该 CLI 不支持向运行中的非交互任务追加消息；可先停止，或等待结束后续接会话。');
    if (!record.sessionId) throw new Error('该任务没有可恢复的会话 ID');
    if (overrides?.model) record.model = overrides.model;
    if (overrides?.reasoningEffort) record.reasoningEffort = overrides.reasoningEffort;
    if (record.role === 'writer') this.reserveWriter(taskId, record.scope, taskId);
    try {
    const adapter = this.adapters.get(record.adapterId)!;
    const directory = path.join(this.appData, 'agents', this.project.activeManifest.projectId, taskId);
    await mkdir(directory, { recursive: true });
    const rawLogPath = path.join(directory, 'events.jsonl');
    await appendFile(rawLogPath, '', 'utf8');
    let rawLogQueue = Promise.resolve();
    let streamedRaw = false;
    const recordRaw = (line: string) => { streamedRaw = true; rawLogQueue = rawLogQueue.then(() => appendFile(rawLogPath, line.endsWith('\n') ? line : `${line}\n`, 'utf8')).catch(() => {}); };
    const authorRevision = this.project.authorEditRevision;
    const startFiles = (await this.project.files()).map((file) => file.path);
    const startHashes = await this.project.hashFiles(startFiles);
    record.state = 'running'; record.endedAt = undefined; record.error = undefined; record.finalMessage = undefined;
    await this.project.eventStore.append('agent.task', record as never, 'agent');
    this.emit({ taskId, type: 'state', at: now(), payload: { state: 'running', role: record.role } });
    const isolatedReadOnly = ['observer', 'memory-curator', 'style-coach'].includes(record.role);
    let sessionPersistence = Promise.resolve();
    let activeTask: ActiveTask | undefined;
    const onSessionId = (sessionId: string) => {
      if (record.sessionId === sessionId) return;
      record.sessionId = sessionId;
      const snapshot: AgentTaskRecord = { ...record, startHashes: { ...record.startHashes }, changedFiles: [...record.changedFiles] };
      sessionPersistence = sessionPersistence.then(() => this.project.eventStore.append('agent.task', snapshot as never, 'agent')).then(() => undefined).catch((error: Error) => {
        this.emit({ taskId, type: 'error', at: now(), payload: `会话恢复标识保存失败：${error.message}` });
      });
      if (activeTask) activeTask.sessionPersistence = sessionPersistence;
    };
    const run = adapter.run({ model: record.model, taskId, root: this.project.activeRoot, prompt: message, readOnly: !['writer', 'researcher'].includes(record.role), outputPath: path.join(directory, `final-${Date.now()}.txt`), sessionId: record.sessionId, env: await this.guardedEnvironment(), startupTimeoutMs: ['writer', 'researcher'].includes(record.role) ? 300_000 : 180_000, reasoningEffort: record.reasoningEffort ?? reasoningEffortFor(record.role), ignoreUserConfig: isolatedReadOnly, networkAccess: Boolean(record.allowNetwork), recordRaw, onSessionId, emit: (event) => this.emit(event) });
    activeTask = { process: run.process, record, adapter, settled: Promise.resolve(), sessionPersistence };
    this.active.set(taskId, activeTask);
    const settled = run.completed.then(async (result) => {
      if (!['writer', 'researcher'].includes(record.role)) await this.waitForConcurrentWriters(taskId);
      await sessionPersistence;
      const endFiles = (await this.project.files()).map((file) => file.path);
      const endHashes = await this.project.hashFiles([...new Set([...startFiles, ...endFiles])]);
      const observedChanges = Object.keys(endHashes).filter((file) => endHashes[file] !== startHashes[file]);
      const authorChanged = observedChanges.filter((file) => this.project.isAuthorEditSince(file, endHashes[file], authorRevision));
      const agentChanged = observedChanges.filter((file) => this.project.isOtherAgentEditSince(taskId, file, endHashes[file], authorRevision));
      record.concurrentAgentFiles = [...new Set([...(record.concurrentAgentFiles ?? []), ...agentChanged])];
      const changed = observedChanges.filter((file) => !authorChanged.includes(file) && !agentChanged.includes(file));
      record.concurrentAuthorFiles = [...new Set([...(record.concurrentAuthorFiles ?? []), ...authorChanged])];
      const unauthorized = record.role === 'writer' ? changed.filter((file) => !allowedPath(file, record.scope)) : changed;
      record.changedFiles = [...new Set([...record.changedFiles, ...changed])];
      record.verifiedTextFiles = await this.verifiedTextFiles(record.changedFiles);
      record.state = record.state === 'cancelled' ? 'cancelled' : result.exitCode === 143 ? 'cancelled' : result.exitCode !== 0 ? 'failed' : unauthorized.length ? 'awaiting-author' : 'completed';
      record.error = record.state === 'cancelled' ? record.error : unauthorized.length ? `续接会话产生授权范围外变化：${unauthorized.join('、')}` : result.exitCode === 0 ? undefined : result.exitCode === 143 ? record.error || '作者停止了任务；已有文件变化已保留供检查。' : adapterFailure(result.exitCode, result.raw);
      if (record.role === 'writer') this.project.recordAgentEdits(taskId, Object.fromEntries(changed.filter((file) => allowedPath(file, record.scope)).map((file) => [file, endHashes[file]])));
      record.finalMessage = result.finalMessage; record.endedAt = now(); record.sessionId = result.sessionId ?? record.sessionId;
      await rawLogQueue;
      if (!streamedRaw) await appendFile(rawLogPath, `${result.raw.join('\n')}\n`, 'utf8');
      await this.project.eventStore.append('agent.task', record as never, 'agent');
      await this.syncCreativeTask(record);
      await this.syncProjectPosition(record);
      this.active.delete(taskId);
      if (record.state === 'completed' && record.role === 'writer') this.onWriterCompleted?.(record);
      this.emit({ taskId, type: record.state === 'failed' ? 'error' : 'state', at: now(), payload: { state: record.state, role: record.role, changedFiles: changed, error: record.error ?? null } });
    }).catch(async (error: Error) => {
      await sessionPersistence;
      record.state = 'failed'; record.error = error.message; record.endedAt = now();
      await this.project.eventStore.append('agent.task', record as never, 'agent');
      await this.syncCreativeTask(record);
      this.active.delete(taskId);
      this.emit({ taskId, type: 'error', at: now(), payload: { state: 'failed', role: record.role, error: error.message } });
    });
    activeTask.settled = settled;
    void settled.catch((error) => console.error('Agent finalization failed:', error));
    } finally {
      this.startingWriters.delete(taskId);
    }
  }
}
