import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ContextItem, ContextPack } from '../../src/shared/types.js';
import { recentAuthorFeedback } from '../../src/lib/comments.js';
import { ProjectService } from './project.js';
import { now, uid } from './utils.js';

function terms(value: string) {
  const normalized = value.toLowerCase();
  const words = normalized.match(/[\p{Script=Han}]{2,8}|[a-z\d_-]{2,}/gu) ?? [];
  const chars = [...normalized.replace(/[^\p{Script=Han}]/gu, '')];
  const bigrams = chars.slice(0, -1).map((item, index) => item + chars[index + 1]);
  return new Set([...words, ...bigrams]);
}

function relevance(content: string, queryTerms: Set<string>) {
  const lower = content.toLowerCase();
  let score = 0;
  for (const term of queryTerms) if (lower.includes(term)) score += term.length > 2 ? 3 : 1;
  return score;
}

function excerpt(content: string, queryTerms: Set<string>, limit: number) {
  if (content.length <= limit) return content;
  const positions = [...queryTerms].map((term) => content.toLowerCase().indexOf(term)).filter((item) => item >= 0);
  const center = positions.length ? positions.sort((a, b) => a - b)[0] : 0;
  const start = Math.max(0, center - Math.floor(limit * 0.25));
  return `${start ? '…\n' : ''}${content.slice(start, start + limit)}${start + limit < content.length ? '\n…' : ''}`;
}

function chapterNumber(filePath?: string) {
  const match = filePath?.match(/(?:^|\/)第0*(\d+)章(?:[-_.]|$)/u);
  return match ? Number(match[1]) : undefined;
}

function profileSnapshot(value?: string) {
  if (!value) return undefined;
  try { return JSON.parse(value) as unknown; } catch { return { error: '作者档案快照损坏，需要重新关联或导入' }; }
}

function compactProfileSnapshot(value?: string) {
  const parsed = profileSnapshot(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;
  const profile = parsed as { id?: unknown; rules?: unknown };
  if (!Array.isArray(profile.rules)) return parsed;
  const rules = profile.rules
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .slice(0, 8)
    .map((item) => ({ category: item.category, text: item.text, status: item.status, evidence: Array.isArray(item.evidence) ? item.evidence.slice(0, 2) : [] }));
  return { id: profile.id, rules };
}

export class ContextAssembler {
  constructor(private readonly project: ProjectService) {}

  async build(input: { task: string; filePath?: string; content?: string; budget?: number }): Promise<ContextPack> {
    const budget = Math.min(80_000, Math.max(4_000, input.budget ?? 28_000));
    const state = await this.project.state();
    const queryTerms = terms(`${input.task}\n${input.content ?? ''}\n${state.continueCard.goal?.title ?? ''}`);
    const candidates: Array<ContextItem & { score: number; fixed?: boolean; essential?: boolean }> = [];
    if (input.filePath && input.content !== undefined) {
      candidates.push({ id: uid('ctx'), kind: 'current-buffer', title: `当前缓冲区 · ${path.basename(input.filePath)}`, source: input.filePath, content: input.content, reason: '任务直接作用的当前文本，包含尚未保存内容', characters: input.content.length, included: true, score: 10_000, fixed: true });
    }
    const manuscriptFiles = state.files.filter((item) => item.category === 'manuscript');
    const currentManuscriptIndex = manuscriptFiles.findIndex((item) => item.path === input.filePath);
    const currentChapterNumber = chapterNumber(input.filePath);
    const files = state.files.filter((file) => file.path !== input.filePath && ['manuscript', 'canon', 'planning', 'research', 'decision'].includes(file.category));
    for (const file of files) {
      const full = await readFile(path.join(this.project.activeRoot, file.path), 'utf8');
      const lexicalRelevance = relevance(full, queryTerms);
      const base = file.category === 'canon' ? 60 : file.category === 'planning' ? 45 : file.category === 'research' ? lexicalRelevance > 0 ? 85 : 10 : file.category === 'decision' ? 40 : 0;
      const manuscriptIndex = file.category === 'manuscript' ? manuscriptFiles.findIndex((item) => item.path === file.path) : -1;
      const fileChapterNumber = chapterNumber(file.path);
      const manuscriptDistance = currentChapterNumber !== undefined && fileChapterNumber !== undefined
        ? Math.abs(fileChapterNumber - currentChapterNumber)
        : currentManuscriptIndex >= 0 && manuscriptIndex >= 0 ? Math.abs(manuscriptIndex - currentManuscriptIndex) : Number.POSITIVE_INFINITY;
      const related = manuscriptDistance <= 3 ? 130 - manuscriptDistance * 15 : 0;
      const score = base + related + lexicalRelevance;
      if (score <= 0) continue;
      const maxExcerpt = file.category === 'manuscript' ? 5_000 : 3_500;
      const content = excerpt(full, queryTerms, maxExcerpt);
      candidates.push({ id: uid('ctx'), kind: file.category, title: path.basename(file.path), source: file.path, content, reason: file.category === 'canon' ? '相关正典与故事事实' : file.category === 'planning' ? '当前目标与滚动规划' : file.category === 'research' ? '任务相关研究资料，尚不等于正典' : file.category === 'decision' ? '作者已确认的高影响决定' : related > 0 ? '当前章节相邻正文' : '任务关键词命中的既有正文', characters: content.length, included: false, score, essential: file.category === 'manuscript' && manuscriptDistance <= 2 });
    }
    const relevantFacts = state.facts
      .map((fact) => ({ fact, score: relevance(`${fact.subject}\n${fact.statement}`, queryTerms) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ fact }) => ({ category: fact.category, subject: fact.subject, statement: fact.statement, status: fact.status, evidence: fact.evidence.slice(0, 1) }));
    const compactTask = (task: typeof state.tasks[number]) => ({ title: task.title, status: task.status, kind: task.kind, assignee: task.assignee, whyNow: task.whyNow, known: task.known.slice(0, 3), missingDecisions: task.missingDecisions.slice(0, 2), completionCriteria: task.completionCriteria.slice(0, 2) });
    const compactComment = (comment: typeof state.comments[number]) => ({ id: comment.id, issueType: comment.issueType, severity: comment.severity, summary: comment.summary, suggestedAction: comment.suggestedAction, status: comment.status, anchor: { filePath: comment.anchor.filePath, quote: comment.anchor.quote }, messages: comment.messages.slice(-2) });
    const goal = state.continueCard.goal ? { title: state.continueCard.goal.title, description: state.continueCard.goal.description, level: state.continueCard.goal.level, authority: state.continueCard.goal.authority, status: state.continueCard.goal.status, target: state.continueCard.goal.target } : undefined;
    const structured = JSON.stringify({ currentGoal: goal, nextTasks: state.continueCard.next.map(compactTask), blockers: state.continueCard.blockers.map(compactTask), relevantFacts, openComments: state.comments.filter((item) => item.status === 'open').slice(0, 5).map(compactComment), recentAuthorFeedback: recentAuthorFeedback(state.comments).map(({ comment, latestAuthorFeedback }) => ({ ...compactComment(comment), latestAuthorFeedback })), authorProfileSnapshot: compactProfileSnapshot(state.manifest.authorProfile?.snapshot) }, null, 2);
    candidates.push({ id: uid('ctx'), kind: 'workbench-state', title: '当前目标、任务、事实与评论', source: '.novel/events/', content: structured, reason: '工作台从可迁移事件中重建的当前创作状态', characters: structured.length, included: false, score: 90 });
    const ranked = candidates.sort((a, b) => b.score - a.score);
    let used = 0;
    for (const item of ranked.filter((candidate) => candidate.fixed)) {
      item.included = true;
      used += item.characters;
    }
    for (const kind of ['canon', 'planning'] as const) {
      const item = ranked.find((candidate) => candidate.kind === kind && !candidate.included);
      if (item && used + item.characters <= budget) {
        item.included = true;
        used += item.characters;
      }
    }
    if (budget >= 12_000) {
      for (const item of ranked.filter((candidate) => candidate.essential && !candidate.included).slice(0, 2)) {
        if (used + item.characters <= budget) {
          item.included = true;
          used += item.characters;
        }
      }
    }
    const workbenchState = ranked.find((candidate) => candidate.kind === 'workbench-state' && !candidate.included);
    if (workbenchState && used + workbenchState.characters <= budget) {
      workbenchState.included = true;
      used += workbenchState.characters;
    }
    for (const item of ranked) {
      if (!item.included && used + item.characters <= budget) {
        item.included = true;
        used += item.characters;
      }
    }
    return { id: uid('context'), task: input.task, createdAt: now(), budget, characters: used, items: candidates.map(({ score: _score, fixed: _fixed, essential: _essential, ...item }) => item), gaps: state.facts.length ? [] : ['尚未建立结构化故事事实；Agent 需区分正文证据与推断'] };
  }
}
