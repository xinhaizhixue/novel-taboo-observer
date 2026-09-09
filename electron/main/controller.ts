import { BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron';
import type { FSWatcher } from 'chokidar';
import path from 'node:path';
import type { CreativeTask, FileWriteResult, Goal, NavigationProposal, ObserverComment, WorkbenchApi } from '../../src/shared/types.js';
import { AgentHub } from './agents/hub.js';
import { ContextAssembler } from './context.js';
import { ProjectService } from './project.js';
import { RecoveryStore } from './recovery.js';
import { relocateComment } from './observer.js';
import { combineStoryRoutes } from './navigation.js';
import { SettingsStore } from './settings.js';
import { AuthorProfileStore } from './profile.js';
import { exists, hashText, now, readJson, uid, writeJson } from './utils.js';
import { watchProjectFiles } from './watch.js';
import { analyzeCanonImpact } from './canon-impact.js';
import { ProjectTrashStore } from './trash.js';
import { automaticReviewTargets } from './literary-review.js';
import type { AgentTaskRecord } from '../../src/shared/types.js';
import { withDeadline } from './shutdown.js';

type HandlerMap = {
  [K in keyof WorkbenchApi as WorkbenchApi[K] extends (...args: never[]) => Promise<unknown> ? K : never]?: WorkbenchApi[K]
};

export class WorkbenchController {
  readonly project = new ProjectService(uid('session'));
  readonly settings: SettingsStore;
  readonly recovery: RecoveryStore;
  readonly hub: AgentHub;
  readonly context: ContextAssembler;
  readonly profile: AuthorProfileStore;
  readonly trash: ProjectTrashStore;
  private watcher?: FSWatcher;
  private watcherRevision = 0;
  private closing = false;
  private reviewQueue = Promise.resolve();
  private reviewGeneration = 0;
  private readonly buffers = new Map<string, { dirty: boolean; hash: string; content?: string }>();
  private activeBufferPath = '';
  private observer = { active: false, count: 0, budget: 40, startedAt: undefined as string | undefined };
  private readonly runtimePath: string;

  constructor(private readonly appData: string) {
    this.settings = new SettingsStore(appData);
    this.recovery = new RecoveryStore(appData, () => this.settings.get());
    this.profile = new AuthorProfileStore(appData);
    this.trash = new ProjectTrashStore(appData, this.project);
    this.hub = new AgentHub(appData, this.project, this.profile);
    this.context = new ContextAssembler(this.project);
    this.hub.onWriterCompleted = (record) => this.enqueueWriterReview(record);
    this.runtimePath = path.join(appData, 'runtime.json');
    this.hub.subscribe((event) => {
      this.send('workbench:agent-event', event);
      if (event.type === 'state' || event.type === 'error') this.send('workbench:project-change');
    });
  }

  private enqueueWriterReview(record: AgentTaskRecord) {
    const root = this.project.activeRoot;
    const generation = this.reviewGeneration;
    this.reviewQueue = this.reviewQueue.then(async () => {
      if (this.closing || generation !== this.reviewGeneration || this.project.activeRoot !== root) return;
      const settings = await this.settings.get();
      if (!settings.review.afterWriter) return;
      const state = await this.project.state();
      const completedWriters = state.agentTasks.filter((task) => task.role === 'writer' && task.state === 'completed').length;
      const sequence = completedWriters % Math.max(1, settings.review.sequenceEvery) === 0;
      const targets = automaticReviewTargets(state.files.filter((file) => file.category === 'manuscript').map((file) => file.path), record.changedFiles, sequence);
      for (const target of targets) {
        if (this.closing || generation !== this.reviewGeneration || this.project.activeRoot !== root) return;
        await this.hub.waitForReviews();
        if (this.closing || generation !== this.reviewGeneration || this.project.activeRoot !== root) return;
        const file = await this.project.readFile(target.filePath);
        const buffer = this.buffers.get(file.path);
        const content = buffer?.dirty && buffer.content !== undefined ? buffer.content : file.content;
        const task = await this.hub.runObserver({ model: record.adapterId === 'codex' ? settings.agents.codexReviewModel || undefined : undefined, reasoningEffort: settings.agents.reviewReasoning, adapterId: record.adapterId, mode: 'manual', reviewScope: target.scope, reviewWindow: settings.review.window, sourceWriterTaskId: record.id, snapshot: { id: uid('review-snapshot'), filePath: file.path, content, hash: hashText(content), editorVersion: 0, createdAt: now() } });
        this.send('workbench:project-change');
        await this.hub.waitForTask(task.id);
      }

    }).catch(async (error) => {
      console.error('Automatic literary review failed:', error);
      if (this.project.activeRoot === root && !this.closing) {
        await this.project.eventStore.append('review.report', { id: uid('review-failed'), taskId: '', scope: 'chapter', status: 'failed', primaryFile: record.changedFiles[0] || '', createdAt: now(), completedAt: now(), summary: `Writer 已结束，但自动审阅没有完成：${String(error)}`, sources: [], omittedPaths: record.changedFiles, gaps: ['需要重新发起审阅。'], assessments: [], commentIds: [], unanchored: [], sourceWriterTaskId: record.id }, 'observer');
        this.send('workbench:project-change');
      }
    });
    void this.reviewQueue.catch((error) => console.error('Could not record review failure:', error));
  }

  private send(channel: string, payload?: unknown) {
    if (this.closing) return;
    for (const window of BrowserWindow.getAllWindows()) if (!window.isDestroyed() && !window.webContents.isDestroyed()) window.webContents.send(channel, payload);
  }

  private async remember(root: string) {
    await writeJson(this.runtimePath, { recentProject: root, updatedAt: now() });
  }

  private async watch() {
    const revision = ++this.watcherRevision;
    const root = this.project.activeRoot;
    const next = await watchProjectFiles(root, {
      onFile: (change) => {
        this.send('workbench:external-file-change', change);
        // The buffer event keeps an open editor safe, while the project event
        // refreshes the file tree, counts and Git state for newly added,
        // removed or renamed files created by an external Agent.
        this.send('workbench:project-change');
      },
      onProject: () => this.send('workbench:project-change')
    });
    if (revision !== this.watcherRevision || root !== this.project.activeRoot) {
      await next.close();
      return;
    }
    const previous = this.watcher;
    this.watcher = next;
    // A large previous project can take a noticeable amount of time to release
    // all file-system handles. The new project is already being watched, so do
    // not make repository navigation wait for that cleanup.
    if (previous) void previous.close().catch((error) => console.warn('Previous project watcher could not close cleanly:', error));
  }

  register() {
    const handlers: HandlerMap = {
      chooseProject: async () => (await dialog.showOpenDialog({ title: '选择小说 Git 仓库', properties: ['openDirectory', 'createDirectory'] })).filePaths[0] ?? null,
      createProject: async (input) => { if (this.hub.hasActiveTasks) throw new Error('请先停止正在运行的 Agent，再切换作品仓库'); const state = await this.project.create(input); this.buffers.clear(); this.activeBufferPath = ''; await this.remember(state.root); await this.watch(); return state; },
      openProject: async (root) => { if (this.hub.hasActiveTasks) throw new Error('请先停止正在运行的 Agent，再切换作品仓库'); const state = await this.project.open(root); this.buffers.clear(); this.activeBufferPath = ''; if (state.manifest.authorProfile?.snapshot) await this.profile.importSnapshot(state.manifest.authorProfile.snapshot); await this.hub.reconcileInterrupted(); await this.remember(state.root); await this.watch(); return this.project.state(); },
      addWork: (title) => this.project.addWork(title),
      activateWork: (workId) => this.project.activateWork(workId),
      refreshProject: () => this.project.state(),
      readFile: (filePath) => this.project.readFile(filePath),
      searchProject: (query) => this.project.search(query),
      writeFile: async (input) => {
        const result = await this.project.writeFile(input.path, input.content, input.expectedHash, input.createOnly) as FileWriteResult;
        if (!result.conflict) {
          this.buffers.set(input.path, { dirty: false, hash: result.hash, content: input.content });
          await this.project.eventStore.append('file.changed', { path: input.path, origin: 'author', reason: input.reason || 'workbench-write', hash: result.hash }, 'author');
          this.send('workbench:project-change');
        }
        return result;
      },
      moveFile: async (input) => {
        const buffer = this.buffers.get(input.from);
        if (buffer?.dirty) throw new Error(`“${input.from}”还有未保存内容，请先保存再移动文件。`);
        const moved = await this.project.moveFile(input.from, input.to);
        if (buffer) { this.buffers.delete(input.from); this.buffers.set(moved.to, buffer); }
        await this.project.eventStore.append('file.moved', moved as never, 'author');
        const state = await this.project.state();
        if (state.continueCard.lastFile === input.from) await this.project.eventStore.append('project.position', { filePath: moved.to }, 'system');
        this.send('workbench:project-change');
        return this.project.state();
      },
      repositoryInfo: () => this.project.gitService.info(),
      updateGitPolicy: async (policy) => { const state = await this.project.updateGitPolicy(policy); this.send('workbench:project-change'); return state; },
      revealProjectFolder: async () => { const error = await shell.openPath(this.project.activeRoot); if (error) throw new Error(error); },
      copyText: async (text) => { clipboard.writeText(text); },
      analyzeTrash: (input) => this.trash.analyze(input.kind, input.path),
      trashProjectItem: async (input) => {
        if (this.hub.hasActiveTasks) throw new Error('请先停止正在运行的 Agent，再删除或移走作品内容');
        for (const [filePath, buffer] of this.buffers) if (buffer.dirty && (filePath === input.path || filePath.startsWith(`${input.path.replace(/\/$/, '')}/`))) throw new Error('待删除范围还有未保存内容，请先保存或恢复后再删除');
        const result = await this.trash.trash(input.kind, input.path, input.confirmation);
        for (const filePath of [...this.buffers.keys()]) if (filePath === input.path || filePath.startsWith(`${input.path.replace(/\/$/, '')}/`)) this.buffers.delete(filePath);
        this.send('workbench:project-change');
        return result;
      },
      listTrash: () => this.trash.list(),
      restoreTrash: async (id) => { const state = await this.trash.restore(id); this.send('workbench:project-change'); return state; },
      trashCurrentProject: async (input) => {
        if (this.hub.hasActiveTasks) throw new Error('请先停止正在运行的 Agent，再删除整个仓库');
        if ([...this.buffers.values()].some((buffer) => buffer.dirty)) throw new Error('仍有未保存正文，请先保存或恢复后再删除整个仓库');
        const title = this.project.activeManifest.title;
        const projectId = this.project.activeManifest.projectId;
        if (input.confirmation.trim() !== title) throw new Error(`请输入“${title}”确认把整个仓库移到系统废纸篓`);
        const root = this.project.activeRoot;
        await this.watcher?.close();
        this.watcher = undefined;
        await shell.trashItem(root);
        for (const sidecar of [path.join(this.appData, 'project-trash', projectId), path.join(this.appData, 'recovery', projectId)]) if (await exists(sidecar)) await shell.trashItem(sidecar);
        await writeJson(this.runtimePath, { updatedAt: now() });
        this.buffers.clear();
      },
      createRecovery: async (input) => this.recovery.create(this.project.activeManifest.projectId, input.path, input.content, input.reason, input.sessionEnd),
      listRecovery: (filePath) => this.recovery.list(this.project.activeManifest.projectId, filePath),
      restoreRecovery: async (id) => {
        const restored = await this.recovery.restore(this.project.activeManifest.projectId, id);
        const disk = await this.project.readFile(restored.entry.path);
        return { ...disk, content: restored.content, hash: disk.hash };
      },
      appendEvent: (type, payload, source) => this.project.eventStore.append(type, payload, source),
      gitStatus: () => this.project.gitService.status(),
      gitDiff: (filePath, staged) => this.project.gitService.diff(filePath, staged),
      gitFileVersions: (filePath) => this.project.gitService.versions(filePath),
      gitCommit: (input) => {
        if ((this.project.activeManifest.gitPolicy ?? 'author-checkpoints') === 'local-only') throw new Error('当前作品设置为“仅本地、不提交”。如需建立检查点，请先在项目设置中修改 Git 提交策略。');
        return this.project.gitService.commit(input.message, input.paths, input.explicitAuthorization);
      },
      listAgents: () => this.hub.list(),
      runAgent: async (input) => {
        if (input.role === 'writer' && !input.scope.length) throw new Error('Writer 任务必须明确文件或目录范围');
        if (input.role === 'writer') { await this.assertNoDirtyBuffers(input.scope); await this.preserveWriterBaseline(input.scope); }
        const settings = await this.settings.get();
        return this.hub.runTask({ ...input, ...(input.adapterId === 'codex' && input.role === 'writer' ? { model: input.model || settings.agents.codexWriterModel || undefined, reasoningEffort: input.reasoningEffort || settings.agents.writerReasoning } : {}) });
      },
      runObserver: async (input) => {
        if (input.mode === 'automatic') {
          if (!this.observer.active) throw new Error('Observer 会话未开启');
          if (this.observer.count >= this.observer.budget) throw new Error('Observer 自动分析已达到本会话软预算，请确认继续或切换手动模式');
          this.observer.count += 1;
        }
        const settings = await this.settings.get();
        return this.hub.runObserver({ ...input, model: input.model || (input.adapterId === 'codex' ? settings.agents.codexReviewModel || undefined : undefined), reasoningEffort: input.reasoningEffort || settings.agents.reviewReasoning });
      },
      cancelAgent: (id) => this.hub.cancel(id),
      stopAllAgents: () => { ++this.reviewGeneration; return this.hub.cancelAll(); },
      sendAgentMessage: async (id, message) => { const record = await this.hub.record(id); if (record?.role === 'writer') { await this.assertNoDirtyBuffers(record.scope); await this.preserveWriterBaseline(record.scope); } const settings = await this.settings.get(); return this.hub.sendMessage(id, message, record?.adapterId === 'codex' ? { model: (record.role === 'writer' ? settings.agents.codexWriterModel : settings.agents.codexReviewModel) || undefined, reasoningEffort: record.role === 'writer' ? settings.agents.writerReasoning : settings.agents.reviewReasoning } : undefined); },
      createContextPack: (input) => this.context.build(input),
      observerSession: async (action) => {
        const settings = await this.settings.get();
        if (action === 'start') this.observer = { active: true, count: 0, budget: settings.observer.sessionSoftBudget, startedAt: now() };
        if (action === 'stop') this.observer.active = false;
        return { ...this.observer };
      },
      relocateComments: async (input) => {
        const state = await this.project.state();
        const comments = state.comments.filter((item) => item.anchor.filePath === input.filePath).map((item) => relocateComment(item, input.content));
        for (const comment of comments) {
          const before = state.comments.find((item) => item.id === comment.id)!;
          if (before.status !== comment.status || before.anchor.start !== comment.anchor.start || before.anchor.currentHash !== comment.anchor.currentHash) await this.project.eventStore.append('comment.updated', comment as never, 'system');
        }
        return comments;
      },
      commentFeedback: (input) => this.commentFeedback(input),
      analyzeCanonImpact: (input) => analyzeCanonImpact(this.project, input),
      updateTask: (input) => this.updateTask(input),
      updateGoal: (input) => this.updateGoal(input),
      decideProposal: (input) => this.decideProposal(input),
      getAuthorProfile: () => this.profile.get(),
      upsertStyleRule: async (input) => { const profile = await this.profile.upsert(input); await this.project.linkAuthorProfile(profile); this.send('workbench:project-change'); return profile; },
      deleteStyleRule: async (id) => { const profile = await this.profile.remove(id); await this.project.linkAuthorProfile(profile); this.send('workbench:project-change'); return profile; },
      exportAuthorProfile: async () => {
        const result = await dialog.showSaveDialog({ title: '导出作者档案', defaultPath: 'novel-author-profile.json', filters: [{ name: '作者档案', extensions: ['json'] }] });
        if (result.canceled || !result.filePath) return null;
        await this.profile.exportFile(result.filePath);
        return result.filePath;
      },
      importAuthorProfile: async () => {
        const result = await dialog.showOpenDialog({ title: '导入作者档案', properties: ['openFile'], filters: [{ name: '作者档案', extensions: ['json'] }] });
        const file = result.filePaths[0];
        if (!file) return null;
        const profile = await this.profile.importFile(file);
        await this.project.linkAuthorProfile(profile);
        this.send('workbench:project-change');
        return profile;
      },
      getSettings: () => this.settings.get(),
      updateSettings: (input) => this.settings.update(input),
      getRecentProject: async () => process.env.NOVEL_OBSERVER_PROJECT || (await readJson<{ recentProject?: string }>(this.runtimePath, {})).recentProject || null,
      updateBufferState: async (input) => {
        const openedNewFile = !input.dirty && this.activeBufferPath !== input.path;
        this.buffers.set(input.path, { dirty: input.dirty, hash: input.hash, content: input.content });
        if (openedNewFile) {
          this.activeBufferPath = input.path;
          await this.project.eventStore.append('project.position', { filePath: input.path }, 'system');
          this.send('workbench:project-change');
        }
      }
    };
    for (const [name, handler] of Object.entries(handlers)) ipcMain.handle(`workbench:${name}`, (_event, ...args) => {
      if (this.closing) throw new Error('正在保存并退出，请稍候。');
      return (handler as (...values: unknown[]) => unknown)(...args);
    });
  }

  private async preserveWriterBaseline(scope: string[]) {
    for (const file of await this.project.files()) {
      if (file.category !== 'manuscript' || !scope.some((item) => file.path === item || file.path.startsWith(`${item.replace(/\/$/, '')}/`))) continue;
      const source = await this.project.readFile(file.path);
      await this.recovery.create(this.project.activeManifest.projectId, file.path, source.content, 'before-writer');
    }
  }

  private async assertNoDirtyBuffers(scope: string[]) {
    for (const [file, buffer] of this.buffers) {
      const intersects = scope.some((item) => file === item || file.startsWith(`${item.replace(/\/$/, '')}/`));
      if (!intersects || !buffer.dirty) continue;
      if (buffer.content !== undefined) await this.recovery.create(this.project.activeManifest.projectId, file, buffer.content, 'before-agent-conflict');
      throw new Error(`“${file}”还有未保存修改。请先保存、放弃或另存后再让 Writer 修改该范围。`);
    }
  }

  async prepareToClose() {
    this.closing = true;
    ++this.reviewGeneration;
    try {
      // Protect author edits before waiting for external processes.
      if (this.project.isActive) for (const [file, buffer] of this.buffers) {
        if (!buffer.dirty || buffer.content === undefined) continue;
        await withDeadline(this.recovery.create(this.project.activeManifest.projectId, file, buffer.content, 'session-end', true), 5_000, `“${file}”恢复副本保存超时，请保存正文后重试退出。`);
      }
    } catch (error) { this.closing = false; throw error; }
    try {
      await withDeadline(this.hub.cancelAll(), 8_000, 'Agent 停止超时');
    } catch (error) {
      this.hub.forceStopAll();
      console.warn('Agent cleanup did not finish:', error);
    }
    ++this.watcherRevision;
    const watcher = this.watcher;
    this.watcher = undefined;
    if (watcher) await withDeadline(watcher.close(), 2_000, '文件监听关闭超时').catch((error) => console.warn(error));
  }

  private async commentFeedback(input: { commentId: string; action: 'accept' | 'reject' | 'defer' | 'review' | 'explain' | 'intentional' | 'forward'; reason?: string }) {
    const state = await this.project.state();
    const current = state.comments.find((item) => item.id === input.commentId);
    if (!current) throw new Error('评论不存在');
    const status: Record<typeof input.action, ObserverComment['status']> = { accept: 'accepted', reject: 'rejected', defer: 'deferred', review: 'review-requested', explain: current.status, intentional: 'intentional', forward: current.status };
    const actionLabel = { accept: '接受建议', reject: '拒绝建议', defer: '暂缓处理', review: '请求复查', explain: '请求解释', intentional: '作者有意保留', forward: '已发回 Writer' }[input.action];
    const updated: ObserverComment = { ...current, status: status[input.action], updatedAt: now(), messages: [...current.messages, { id: uid('msg'), source: 'author', body: `${actionLabel}${input.reason ? `：${input.reason}` : ''}`, createdAt: now() }] };
    await this.project.eventStore.append('comment.updated', updated as never, 'author');
    this.send('workbench:project-change');
    return updated;
  }

  private async updateTask(input: Partial<CreativeTask> & { id?: string }) {
    const state = await this.project.state();
    const current = input.id ? state.tasks.find((item) => item.id === input.id) : undefined;
    const timestamp = now();
    const task: CreativeTask = {
      id: input.id || uid('task'), title: input.title || current?.title || '新任务', description: input.description ?? current?.description ?? '', level: input.level ?? current?.level ?? 'work', status: input.status ?? current?.status ?? 'next', kind: input.kind ?? current?.kind ?? 'writing', assignee: input.assignee ?? current?.assignee ?? 'author', source: input.source ?? current?.source ?? 'author', priority: input.priority ?? current?.priority ?? 'normal', whyNow: input.whyNow ?? current?.whyNow ?? '', known: input.known ?? current?.known ?? [], missingDecisions: input.missingDecisions ?? current?.missingDecisions ?? [], aiPreAnalysis: input.aiPreAnalysis ?? current?.aiPreAnalysis ?? '', authorDecision: input.authorDecision ?? current?.authorDecision ?? '', agentWork: input.agentWork ?? current?.agentWork ?? '', completionCriteria: input.completionCriteria ?? current?.completionCriteria ?? [], links: input.links ?? current?.links ?? [], dependencies: input.dependencies ?? current?.dependencies ?? [], createdAt: current?.createdAt ?? timestamp, updatedAt: timestamp, cancellationReason: input.cancellationReason ?? current?.cancellationReason
    };
    if (task.status === 'now') {
      for (const other of state.tasks.filter((item) => item.id !== task.id && item.status === 'now')) {
        await this.project.eventStore.append('task.upsert', { ...other, status: 'next', updatedAt: timestamp } as never, 'system');
      }
    }
    await this.project.eventStore.append('task.upsert', task as never, task.source);
    this.send('workbench:project-change');
    return task;
  }

  private async updateGoal(input: Partial<Goal> & { id?: string }) {
    const current = input.id ? (await this.project.state()).goals.find((item) => item.id === input.id) : undefined;
    const goal: Goal = { id: input.id || uid('goal'), level: input.level ?? current?.level ?? 'work', title: input.title || current?.title || '新目标', description: input.description ?? current?.description ?? '', authority: input.authority ?? current?.authority ?? 'author-pinned', status: input.status ?? current?.status ?? 'active', target: input.target ?? current?.target, updatedAt: now() };
    await this.project.eventStore.append('goal.upsert', goal as never, 'author');
    this.send('workbench:project-change');
    return goal;
  }

  private async decideProposal(input: { proposalId: string; routeId?: string; routeIds?: string[]; combinationNote?: string; decision: 'confirm' | 'reject' }) {
    const state = await this.project.state();
    const current = state.proposals.find((item) => item.id === input.proposalId);
    if (!current) throw new Error('剧情方案不存在');
    const selectedRoutes = input.routeIds?.length ? current.routes.filter((item) => input.routeIds!.includes(item.id)) : [];
    let route = input.routeId ? current.routes.find((item) => item.id === input.routeId) : undefined;
    if (!route && selectedRoutes.length > 1) {
      route = combineStoryRoutes(selectedRoutes, input.combinationNote || '', uid('route-combined'));
    }
    if (input.decision === 'confirm' && !route) throw new Error('请明确选择一条剧情路线');
    const proposal: NavigationProposal = { ...current, routes: route && !current.routes.some((item) => item.id === route!.id) ? [...current.routes, route] : current.routes, status: input.decision === 'confirm' ? 'confirmed' : 'rejected', selectedRouteId: route?.id, selectedRouteIds: selectedRoutes.length > 1 ? selectedRoutes.map((item) => item.id) : route ? [route.id] : undefined, updatedAt: now() };
    await this.project.eventStore.append('proposal.updated', proposal as never, 'author');
    if (route) {
      const goalLevel: Goal['level'] = current.kind === 'opening' ? 'work' : 'chapter';
      for (const goal of state.goals.filter((item) => item.status === 'active' && item.level === goalLevel)) {
        await this.project.eventStore.append('goal.upsert', { ...goal, status: 'paused', updatedAt: now() } as never, 'author');
      }
      for (const task of state.tasks.filter((item) => item.status === 'now')) {
        await this.project.eventStore.append('task.upsert', { ...task, status: 'next', updatedAt: now() } as never, 'author');
      }
      const goal: Goal = { id: uid('goal'), level: goalLevel, title: current.recommendedGoal || route.title, description: route.pitch, authority: 'author-pinned', status: 'active', updatedAt: now() };
      const timestamp = now();
      const task: CreativeTask = {
        id: uid('task'), title: route.firstChapterGoal || `执行路线：${route.title}`, description: route.pitch, level: current.kind === 'opening' ? 'chapter' : 'scene', status: 'now', kind: 'writing', assignee: 'author', source: 'author', priority: 'high',
        whyNow: route.effect, known: route.causalChain, missingDecisions: current.highImpactQuestions, aiPreAnalysis: `代价：${route.tradeoffs.join('；') || '无'}\n风险：${route.risks.join('；') || '无'}\n后续影响：${route.followUpImpact}`,
        authorDecision: `已选择「${route.title}」`, agentWork: `可由 Writer 按此路线执行；新增铺垫：${route.requiredSetup.join('；') || '无'}`,
        completionCriteria: [route.firstChapterGoal || `完成「${route.title}」所需场景目标`, '正文结果与已确认正典不冲突'], links: state.continueCard.lastFile ? [state.continueCard.lastFile] : [], dependencies: [], createdAt: timestamp, updatedAt: timestamp
      };
      await this.project.eventStore.append('goal.upsert', goal as never, 'author');
      await this.project.eventStore.append('task.upsert', task as never, 'author');
      await this.project.eventStore.append('decision.recorded', { proposalId: proposal.id, route, goalId: goal.id, taskId: task.id } as never, 'author');
      await this.project.eventStore.append('project.position', { filePath: state.continueCard.lastFile || '', stage: current.kind === 'opening' ? '开篇和前三章' : state.continueCard.stage, focus: task.title }, 'system');
    }
    this.send('workbench:project-change');
    return proposal;
  }
}
