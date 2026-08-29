import { cp, mkdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import type { ManagedContentCategory, ProjectFile, ProjectState, TrashEntry, TrashImpact, TrashKind } from '../../src/shared/types.js';
import { ProjectService } from './project.js';
import { exists, now, readJson, safeRelative, uid, writeJson } from './utils.js';

const MANAGED_CATEGORIES = new Set<ManagedContentCategory>(['manuscript', 'canon', 'planning', 'research', 'decision']);
const ROOT_BY_CATEGORY: Record<Exclude<ManagedContentCategory, 'manuscript'>, string> = {
  canon: 'canon', planning: 'planning', research: 'research', decision: 'decisions'
};
const FOUNDATIONAL_FILES = new Set(['planning/滚动规划.md', 'canon/故事正典.md', 'canon/作品风格.md', 'research/README.md', 'decisions/README.md']);

type ResolvedTarget = { relative: string; files: ProjectFile[]; category: ManagedContentCategory; title: string; workId?: string };

async function moveRecoverably(source: string, target: string) {
  await mkdir(path.dirname(target), { recursive: true });
  try { await rename(source, target); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error;
    await cp(source, target, { recursive: true, preserveTimestamps: true, errorOnExist: true });
    await rm(source, { recursive: true });
  }
}

function managedCategory(file: ProjectFile): file is ProjectFile & { category: ManagedContentCategory } {
  return MANAGED_CATEGORIES.has(file.category as ManagedContentCategory);
}

function categoryFromPath(relative: string): ManagedContentCategory | undefined {
  if (relative === 'manuscript' || relative.startsWith('manuscript/')) return 'manuscript';
  if (relative === 'canon' || relative.startsWith('canon/')) return 'canon';
  if (relative === 'planning' || relative.startsWith('planning/')) return 'planning';
  if (relative === 'research' || relative.startsWith('research/')) return 'research';
  if (relative === 'decisions' || relative.startsWith('decisions/')) return 'decision';
  return undefined;
}

function isSingleFile(kind: TrashKind) { return kind === 'file' || kind === 'chapter'; }
function isDirectory(kind: TrashKind) { return kind === 'directory' || kind === 'volume'; }

function resolveTarget(state: ProjectState, kind: TrashKind, requested: string): ResolvedTarget {
  const relative = safeRelative(state.root, requested);
  if (!relative) throw new Error('不能把整个仓库作为普通内容移入工作台回收站');

  if (kind === 'work') {
    if (state.manifest.kind !== 'series') throw new Error('只有系列仓库可以单独移除其中一部作品');
    if (state.manifest.works.length <= 1) throw new Error('系列仓库至少保留一部作品；如需全部删除，请从作品中心处理整个仓库');
    const work = state.manifest.works.find((item) => item.manuscriptRoot.replace(/\/$/, '') === relative);
    if (!work) throw new Error('目标不是当前系列中的完整作品');
    const files = state.files.filter((file) => file.category === 'manuscript' && (file.path === relative || file.path.startsWith(`${relative}/`)));
    if (!files.length) throw new Error('系列作品正文目录为空或不存在');
    return { relative, files, category: 'manuscript', title: work.title, workId: work.id };
  }

  if (isSingleFile(kind)) {
    const file = state.files.find((item) => item.path === relative);
    if (!file || !managedCategory(file)) throw new Error('只能删除工作台管理的正文、大纲、研究、人物与世界或决定文件');
    return { relative, files: [file], category: file.category, title: path.basename(relative, path.extname(relative)) };
  }

  if (!isDirectory(kind)) throw new Error('不支持的回收站对象类型');
  const files = state.files.filter((file) => managedCategory(file) && file.path.startsWith(`${relative}/`));
  if (!files.length) throw new Error('目录不存在，或其中没有工作台支持的 Markdown/TXT 内容');
  const categories = [...new Set(files.map((file) => file.category as ManagedContentCategory))];
  if (categories.length !== 1) throw new Error('目录跨越多个内容区域，不能作为一个普通目录删除');
  const category = categories[0];
  const protectedRoots = new Set(category === 'manuscript' ? state.manifest.works.map((work) => work.manuscriptRoot.replace(/\/$/, '')) : [ROOT_BY_CATEGORY[category as Exclude<ManagedContentCategory, 'manuscript'>]]);
  if (protectedRoots.has(relative)) throw new Error(category === 'manuscript' ? '作品正文根目录不能作为普通目录删除；系列作品请使用“删除整部作品”，全部内容请从作品中心处理仓库' : '内容区域根目录不能删除；可以删除其中的文件或子目录');
  return { relative, files, category, title: path.basename(relative) };
}

function overlapsReference(reference: string, target: string, files: Set<string>) {
  const normalized = reference.replace(/^\.\//, '').replace(/\/$/, '');
  if (!normalized) return false;
  return normalized === target || normalized.startsWith(`${target}/`) || files.has(normalized) || [...files].some((file) => file.startsWith(`${normalized}/`));
}

function referenceExists(reference: string, files: Set<string>) {
  const normalized = reference.replace(/^\.\//, '').replace(/\/$/, '');
  return files.has(normalized) || [...files].some((file) => file.startsWith(`${normalized}/`));
}

export class ProjectTrashStore {
  constructor(private readonly appData: string, private readonly project: ProjectService) {}

  private directory() { return path.join(this.appData, 'project-trash', this.project.activeManifest.projectId); }
  private indexPath() { return path.join(this.directory(), 'index.json'); }
  private async entries() { return readJson<TrashEntry[]>(this.indexPath(), []); }

  async analyze(kind: TrashKind, requested: string): Promise<TrashImpact> {
    const state = await this.project.state();
    const target = resolveTarget(state, kind, requested);
    const paths = new Set(target.files.map((file) => file.path));
    const contents = await Promise.all(target.files.map((file) => readFile(path.join(state.root, file.path), 'utf8')));
    const characters = contents.reduce((sum, content) => sum + content.replace(/\s/g, '').length, 0);
    const linkedFacts = state.facts.filter((fact) => fact.evidence.some((item) => paths.has(item.filePath))).length;
    const linkedTasks = state.tasks.filter((task) => task.links.some((item) => overlapsReference(item, target.relative, paths))).length;
    const linkedComments = state.comments.filter((comment) => paths.has(comment.anchor.filePath)).length;
    const linkedAgents = state.agentTasks.filter((task) => [...task.scope, ...task.changedFiles].some((item) => overlapsReference(item, target.relative, paths))).length;
    const warnings: string[] = [];
    if (state.continueCard.lastFile && paths.has(state.continueCard.lastFile)) warnings.push('当前继续位置位于待删除内容中；删除后工作台会回到仍然存在的正文或作品总览。');
    if (state.git.files.some((item) => paths.has(item.path) && item.index === '?')) warnings.push('其中包含尚未提交的新文件；Git 历史无法恢复这些文件，必须依靠工作台回收站。');
    if (linkedFacts || linkedTasks || linkedComments || linkedAgents) warnings.push('相关事实、任务、评论和 Agent 历史会保留作为审计证据，并在原文件恢复前显示为需要复核的引用。');
    if (target.files.some((file) => FOUNDATIONAL_FILES.has(file.path))) warnings.push('范围内包含工作台初始化的基础文件；删除后相应引导或上下文可能为空，但仍可从回收站恢复。');
    if (kind === 'work') warnings.push('只移走这部作品的正文并从系列清单解除关联；系列共享的正典、大纲、研究和决定不会自动删除。');
    return { kind, category: target.category, path: target.relative, title: target.title, files: [...paths], characters, linkedFacts, linkedTasks, linkedComments, linkedAgents, warnings };
  }

  async trash(kind: TrashKind, requested: string, confirmation: string) {
    const before = await this.project.state();
    const target = resolveTarget(before, kind, requested);
    const impact = await this.analyze(kind, requested);
    if (confirmation.trim() !== impact.title) throw new Error(`请输入“${impact.title}”确认移入回收站`);
    const id = uid('trash');
    const source = path.join(this.project.activeRoot, impact.path);
    const trashPath = path.join(this.directory(), id, 'payload', impact.path);
    await moveRecoverably(source, trashPath);

    let work: TrashEntry['work'];
    try {
      if (kind === 'work' && target.workId) work = await this.project.removeWorkForTrash(target.workId);
    } catch (error) {
      await moveRecoverably(trashPath, source).catch(() => {});
      throw error;
    }

    const affectedPaths = new Set(impact.files);
    const remainingPaths = new Set(before.files.filter((file) => !affectedPaths.has(file.path)).map((file) => file.path));
    const factsToReview = before.facts.filter((fact) => fact.status !== 'deprecated' && fact.evidence.some((item) => affectedPaths.has(item.filePath)) && !fact.evidence.some((item) => referenceExists(item.filePath, remainingPaths)));
    const tasksToReview = before.tasks.filter((task) => ['now', 'next'].includes(task.status) && task.links.some((item) => overlapsReference(item, impact.path, affectedPaths)) && !task.links.some((item) => referenceExists(item, remainingPaths)));
    const commentsToReview = before.comments.filter((comment) => comment.status !== 'stale' && affectedPaths.has(comment.anchor.filePath));
    const references: NonNullable<TrashEntry['references']> = {
      facts: factsToReview.map((fact) => ({ id: fact.id, status: fact.status })),
      tasks: tasksToReview.map((task) => ({ id: task.id, status: task.status, whyNow: task.whyNow, cancellationReason: task.cancellationReason })),
      comments: commentsToReview.map((comment) => ({ id: comment.id, status: comment.status }))
    };

    const entry: TrashEntry = {
      id, kind, category: impact.category, originalPath: impact.path, trashPath, title: impact.title,
      files: impact.files.length, characters: impact.characters, createdAt: now(), filePaths: impact.files, work, references
    };
    const entries = await this.entries();
    entries.push(entry);
    await writeJson(this.indexPath(), entries);
    await this.project.eventStore.append('file.trashed', { ...entry, linkedFacts: impact.linkedFacts, linkedTasks: impact.linkedTasks, linkedComments: impact.linkedComments, linkedAgents: impact.linkedAgents } as never, 'author');
    const reviewTime = now();
    for (const fact of factsToReview) await this.project.eventStore.append('fact.upsert', { ...fact, status: 'conflict', updatedAt: reviewTime } as never, 'system');
    for (const task of tasksToReview) await this.project.eventStore.append('task.upsert', { ...task, status: 'blocked', whyNow: `关联内容“${impact.path}”已移入工作台回收站，恢复或重新关联后再继续。`, cancellationReason: '关联内容位于工作台回收站', updatedAt: reviewTime } as never, 'system');
    for (const comment of commentsToReview) await this.project.eventStore.append('comment.updated', { ...comment, status: 'stale', updatedAt: reviewTime, messages: [...comment.messages, { id: uid('msg'), source: 'system', body: `锚定文件“${comment.anchor.filePath}”已移入工作台回收站，评论暂时过期。`, createdAt: reviewTime }] } as never, 'system');
    if (before.continueCard.lastFile && impact.files.includes(before.continueCard.lastFile)) {
      const after = await this.project.state();
      const fallback = after.files.filter((file) => file.category === 'manuscript').at(-1)?.path || '';
      await this.project.eventStore.append('project.position', { filePath: fallback, focus: fallback ? '继续现有正文或重新安排下一任务' : '新建正文或从回收站恢复内容' }, 'system');
    }
    return { state: await this.project.state(), entry };
  }

  async list() {
    const entries = await this.entries();
    const available: TrashEntry[] = [];
    for (const entry of entries) {
      if (!(await exists(entry.trashPath))) continue;
      available.push({ ...entry, category: entry.category ?? categoryFromPath(entry.originalPath) });
    }
    return available.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async restore(id: string) {
    const entries = await this.entries();
    const entry = entries.find((item) => item.id === id);
    if (!entry || !(await exists(entry.trashPath))) throw new Error('回收站条目不存在或已经恢复');
    const target = path.join(this.project.activeRoot, safeRelative(this.project.activeRoot, entry.originalPath));
    if (await exists(target)) throw new Error(`原位置“${entry.originalPath}”已有新内容，未覆盖任何文件`);
    await moveRecoverably(entry.trashPath, target);
    try {
      if (entry.work) await this.project.restoreWorkFromTrash(entry.work);
    } catch (error) {
      await moveRecoverably(target, entry.trashPath).catch(() => {});
      throw error;
    }
    await writeJson(this.indexPath(), entries.filter((item) => item.id !== id));
    await this.project.eventStore.append('file.restored', { ...entry, restoredAt: now() } as never, 'author');
    if (entry.references) {
      const restoredState = await this.project.state();
      const restoredPaths = new Set(restoredState.files.map((file) => file.path));
      const restoredAt = now();
      for (const previous of entry.references.facts) {
        const current = restoredState.facts.find((fact) => fact.id === previous.id);
        if (current && current.evidence.some((item) => referenceExists(item.filePath, restoredPaths))) await this.project.eventStore.append('fact.upsert', { ...current, status: previous.status, updatedAt: restoredAt } as never, 'system');
      }
      for (const previous of entry.references.tasks) {
        const current = restoredState.tasks.find((task) => task.id === previous.id);
        if (current && current.links.some((item) => referenceExists(item, restoredPaths))) await this.project.eventStore.append('task.upsert', { ...current, status: previous.status, whyNow: previous.whyNow, cancellationReason: previous.cancellationReason, updatedAt: restoredAt } as never, 'system');
      }
      for (const previous of entry.references.comments) {
        const current = restoredState.comments.find((comment) => comment.id === previous.id);
        if (current && referenceExists(current.anchor.filePath, restoredPaths)) await this.project.eventStore.append('comment.updated', { ...current, status: previous.status, updatedAt: restoredAt, messages: [...current.messages, { id: uid('msg'), source: 'system', body: `锚定文件“${current.anchor.filePath}”已从工作台回收站恢复。`, createdAt: restoredAt }] } as never, 'system');
      }
    }
    if (entry.work?.wasActive) {
      const state = await this.project.state();
      const first = state.files.find((file) => file.category === 'manuscript' && file.path.startsWith(`${entry.originalPath}/`))?.path || '';
      await this.project.eventStore.append('project.position', { filePath: first, focus: `继续《${entry.work.item.title}》` }, 'system');
    }
    return this.project.state();
  }
}
