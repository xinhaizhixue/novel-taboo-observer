import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { ProjectService } from '../electron/main/project.js';
import { exists, hashText } from '../electron/main/utils.js';

const projectArgument = process.argv[2];
const directRoot = projectArgument ? path.resolve(projectArgument) : path.resolve(import.meta.dirname, '..', 'workspaces', 'wan-jie-zhu-shen');
const workspaceRoot = projectArgument ? path.resolve(import.meta.dirname, '..', 'workspaces', projectArgument) : directRoot;
const root = projectArgument && !(await exists(directRoot)) && await exists(workspaceRoot) ? workspaceRoot : directRoot;
const allowIncomplete = process.env.NOVEL_ALLOW_INCOMPLETE === '1';
const project = new ProjectService('novel-audit');
const state = await project.open(root);
let plannedChapters = 0;
try {
  const outline = await readFile(path.join(root, 'planning', '百万字总纲.md'), 'utf8');
  plannedChapters = Number([
    /合计约\s*(\d+)\s*章/,
    /全书(?:共计|合计|计划)?\s*约?\s*(\d+)\s*章/,
    /计划(?:章节|章数)?[^\d]{0,8}(\d+)\s*章/
  ].map((pattern) => outline.match(pattern)?.[1]).find(Boolean) || 0);
} catch { /* optional planning file */ }
let chapterRange = { min: 1_000, max: undefined as number | undefined, source: 'default' };
try {
  const style = await readFile(path.join(root, 'canon', '作品风格.md'), 'utf8');
  const range = style.match(/(?:目标区间|常规章节)[^\d]{0,12}(\d{3,5})\s*[—–~-]\s*(\d{3,5})/);
  if (range) chapterRange = { min: Number(range[1]), max: Number(range[2]), source: 'canon/作品风格.md' };
} catch { /* optional style file */ }
const chapters = state.files.filter((item) => item.category === 'manuscript');
const details = await Promise.all(chapters.map(async (item) => {
  const content = await readFile(path.join(root, item.path), 'utf8');
  const characters = content.replace(/\s/g, '').length;
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const volume = item.path.split('/').length > 2 ? item.path.split('/')[1] : '未分卷';
  return { path: item.path, volume, heading, characters, hash: hashText(content.replace(/\s/g, '')) };
}));
const hashes = new Map<string, string[]>();
for (const item of details) hashes.set(item.hash, [...(hashes.get(item.hash) || []), item.path]);
const duplicateGroups = [...hashes.values()].filter((items) => items.length > 1);
const shortChapters = details.filter((item) => item.characters < chapterRange.min);
const longChapters = chapterRange.max ? details.filter((item) => item.characters > chapterRange.max! * 1.15) : [];
const missingHeadings = details.filter((item) => !item.heading);
const volumes = Object.entries(Object.groupBy(details, (item) => item.volume)).map(([volume, items]) => ({ volume, chapters: items?.length || 0, characters: items?.reduce((sum, item) => sum + item.characters, 0) || 0 }));
const report = {
  root,
  title: state.manifest.title,
  targetCharacters: state.manuscriptStats.targetCharacters,
  totalCharacters: state.manuscriptStats.totalCharacters,
  completion: Number((state.manuscriptStats.progress * 100).toFixed(2)),
  chapters: details.length,
  averageCharactersPerChapter: details.length ? Math.round(state.manuscriptStats.totalCharacters / details.length) : 0,
  recommendedPlannedChaptersWith3PercentBuffer: details.length ? Math.ceil(state.manuscriptStats.targetCharacters / (state.manuscriptStats.totalCharacters / details.length) * 1.03) : 0,
  plannedChapters,
  projectedCharactersAtPlannedChapters: details.length && plannedChapters ? Math.round(state.manuscriptStats.totalCharacters / details.length * plannedChapters) : 0,
  chapterRange,
  restoredState: { currentGoal: state.continueCard.goal?.title || null, currentTask: state.continueCard.focus, facts: state.facts.length, comments: state.comments.length, agentTasks: state.agentTasks.length },
  volumes,
  qualityGates: { shortChapters: shortChapters.map((item) => ({ path: item.path, characters: item.characters })), longChapters: longChapters.map((item) => ({ path: item.path, characters: item.characters })), missingHeadings: missingHeadings.map((item) => item.path), duplicateGroups, missingActiveGoal: Boolean(state.continueCard.focus && !state.continueCard.goal) }
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!allowIncomplete && state.manuscriptStats.totalCharacters < state.manuscriptStats.targetCharacters) {
  process.stderr.write(`正文尚未达到目标：${state.manuscriptStats.totalCharacters}/${state.manuscriptStats.targetCharacters}\n`);
  process.exitCode = 2;
}
if (shortChapters.length || longChapters.length || duplicateGroups.length || missingHeadings.length) process.exitCode = 3;
if (state.continueCard.focus && !state.continueCard.goal) process.exitCode = 4;
