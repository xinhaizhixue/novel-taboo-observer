import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CanonImpactAnalysis, StoryFact } from '../../src/shared/types.js';
import { ProjectService } from './project.js';
import { now, uid } from './utils.js';

function terms(value: string) {
  const chunks = value.match(/[\p{Script=Han}]{2,20}|[a-z\d_-]{3,}/giu) ?? [];
  const candidates = chunks.flatMap((chunk) => {
    if (!/[\p{Script=Han}]/u.test(chunk)) return [chunk];
    const chars = [...chunk];
    const grams = [2, 3, 4, 5, 6].flatMap((size) => chars.slice(0, Math.max(0, chars.length - size + 1)).map((_, index) => chars.slice(index, index + size).join('')));
    return [chunk, ...grams];
  });
  return [...new Set(candidates.map((item) => item.toLocaleLowerCase('zh-CN')))].sort((a, b) => b.length - a.length).slice(0, 48);
}

function matchingExcerpt(content: string, matches: string[]) {
  const line = content.split('\n').find((candidate) => matches.some((term) => candidate.toLocaleLowerCase('zh-CN').includes(term)));
  return (line || content.slice(0, 180)).trim().slice(0, 220);
}

export async function analyzeCanonImpact(project: ProjectService, input: { factId: string; category: StoryFact['category']; subject: string; statement: string }): Promise<CanonImpactAnalysis> {
  const state = await project.state();
  const fact = state.facts.find((item) => item.id === input.factId);
  if (!fact) throw new Error('要修改的故事事实不存在');
  const queryTerms = [...new Set([fact.subject.toLocaleLowerCase('zh-CN'), ...terms(`${fact.subject}\n${fact.statement}`)])].filter((item) => item.length >= 2);
  const relatedFacts = state.facts.filter((item) => item.id !== fact.id && (item.subject === fact.subject || queryTerms.some((term) => `${item.subject}\n${item.statement}`.toLocaleLowerCase('zh-CN').includes(term)))).slice(0, 20);
  const affectedChapters: CanonImpactAnalysis['affectedChapters'] = [];
  const affectedPlans: CanonImpactAnalysis['affectedPlans'] = [];
  const evidencePaths = new Set([fact, ...relatedFacts].flatMap((item) => item.evidence.map((evidence) => evidence.filePath)));
  for (const file of state.files.filter((item) => ['manuscript', 'planning'].includes(item.category))) {
    const content = await readFile(path.join(project.activeRoot, file.path), 'utf8');
    const lower = content.toLocaleLowerCase('zh-CN');
    const matches = queryTerms.filter((term) => lower.includes(term));
    if (!matches.length && !evidencePaths.has(file.path)) continue;
    const item = { filePath: file.path, matches: matches.slice(0, 5), excerpt: matchingExcerpt(content, matches.length ? matches : [fact.subject]) };
    if (file.category === 'manuscript') affectedChapters.push(item); else affectedPlans.push(item);
  }
  const relatedFactIds = relatedFacts.map((item) => item.id);
  const affectedPaths = new Set([...affectedChapters, ...affectedPlans].map((item) => item.filePath));
  const relatedTaskIds = state.tasks.filter((task) => task.links.some((link) => affectedPaths.has(link)) || queryTerms.some((term) => `${task.title}\n${task.description}\n${task.known.join('\n')}`.toLocaleLowerCase('zh-CN').includes(term))).slice(0, 20).map((task) => task.id);
  const warnings: string[] = [];
  if (fact.status === 'author-confirmed') warnings.push('这是作者已确认事实；保存后会形成新的可追溯版本，不会改写历史事件。');
  if (affectedChapters.length) warnings.push(`已有 ${affectedChapters.length} 个正文章节可能依赖旧事实。`);
  if (affectedPlans.length) warnings.push(`已有 ${affectedPlans.length} 份计划可能需要同步调整。`);
  if (!fact.evidence.length) warnings.push('原事实没有正文证据，建议先补充来源再扩大影响范围。');
  return {
    id: uid('canon-impact'), factId: fact.id, generatedAt: now(),
    previous: { category: fact.category, subject: fact.subject, statement: fact.statement, status: fact.status },
    proposed: { category: input.category, subject: input.subject.trim(), statement: input.statement.trim() },
    affectedChapters: affectedChapters.slice(0, 30), affectedPlans: affectedPlans.slice(0, 20), relatedFactIds, relatedTaskIds, warnings
  };
}
