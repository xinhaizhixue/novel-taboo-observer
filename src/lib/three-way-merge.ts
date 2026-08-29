import { diffLines } from 'diff';

interface Edit { start: number; end: number; replacement: string[]; side: 'ours' | 'theirs' }
export interface MergeTextChunk { type: 'text'; content: string }
export interface MergeConflictChunk { type: 'conflict'; id: string; base: string; ours: string; theirs: string }
export type MergeChunk = MergeTextChunk | MergeConflictChunk;
export interface ThreeWayMerge { chunks: MergeChunk[]; conflicts: MergeConflictChunk[]; automatic: boolean }
export type MergeChoice = 'base' | 'ours' | 'theirs';

function lines(value: string) { return value.match(/[^\n]*\n|[^\n]+$/g) ?? []; }

function edits(base: string, variant: string, side: Edit['side']) {
  const result: Edit[] = [];
  let position = 0;
  const parts = diffLines(base, variant);
  for (let index = 0; index < parts.length;) {
    const part = parts[index];
    if (!part.added && !part.removed) { position += lines(part.value).length; index += 1; continue; }
    const start = position;
    const replacement: string[] = [];
    while (index < parts.length && (parts[index].added || parts[index].removed)) {
      const changed = parts[index];
      if (changed.removed) position += lines(changed.value).length;
      if (changed.added) replacement.push(...lines(changed.value));
      index += 1;
    }
    result.push({ start, end: position, replacement, side });
  }
  return result;
}

function overlaps(left: Edit, right: Edit) {
  if (left.start === left.end && right.start === right.end) return left.start === right.start;
  if (left.start === left.end) return left.start >= right.start && left.start <= right.end;
  if (right.start === right.end) return right.start >= left.start && right.start <= left.end;
  return left.start < right.end && right.start < left.end;
}

function applyRegion(baseLines: string[], start: number, end: number, regionEdits: Edit[]) {
  let cursor = start;
  const output: string[] = [];
  for (const edit of [...regionEdits].sort((a, b) => a.start - b.start || a.end - b.end)) {
    output.push(...baseLines.slice(cursor, edit.start), ...edit.replacement);
    cursor = edit.end;
  }
  output.push(...baseLines.slice(cursor, end));
  return output.join('');
}

export function mergeThreeWay(base: string, ours: string, theirs: string): ThreeWayMerge {
  if (ours === theirs) return { chunks: [{ type: 'text', content: ours }], conflicts: [], automatic: true };
  const baseLines = lines(base);
  const all = [...edits(base, ours, 'ours'), ...edits(base, theirs, 'theirs')].sort((a, b) => a.start - b.start || a.end - b.end);
  if (!all.length) return { chunks: [{ type: 'text', content: base }], conflicts: [], automatic: true };
  const regions: Edit[][] = [];
  for (const edit of all) {
    const current = regions.at(-1);
    if (current?.some((candidate) => overlaps(candidate, edit))) current.push(edit); else regions.push([edit]);
  }
  const chunks: MergeChunk[] = [];
  const conflicts: MergeConflictChunk[] = [];
  let cursor = 0;
  for (const [index, region] of regions.entries()) {
    const start = Math.min(...region.map((item) => item.start));
    const end = Math.max(...region.map((item) => item.end));
    if (start > cursor) chunks.push({ type: 'text', content: baseLines.slice(cursor, start).join('') });
    const oursEdits = region.filter((item) => item.side === 'ours');
    const theirsEdits = region.filter((item) => item.side === 'theirs');
    const baseContent = baseLines.slice(start, end).join('');
    const oursContent = oursEdits.length ? applyRegion(baseLines, start, end, oursEdits) : baseContent;
    const theirsContent = theirsEdits.length ? applyRegion(baseLines, start, end, theirsEdits) : baseContent;
    if (!oursEdits.length || !theirsEdits.length || oursContent === theirsContent) chunks.push({ type: 'text', content: oursEdits.length ? oursContent : theirsContent });
    else {
      const conflict: MergeConflictChunk = { type: 'conflict', id: `conflict-${index + 1}`, base: baseContent, ours: oursContent, theirs: theirsContent };
      conflicts.push(conflict); chunks.push(conflict);
    }
    cursor = end;
  }
  if (cursor < baseLines.length) chunks.push({ type: 'text', content: baseLines.slice(cursor).join('') });
  return { chunks, conflicts, automatic: conflicts.length === 0 };
}

export function renderThreeWayMerge(merge: ThreeWayMerge, choices: Record<string, MergeChoice>) {
  return merge.chunks.map((chunk) => chunk.type === 'text' ? chunk.content : chunk[choices[chunk.id] || 'ours']).join('');
}
