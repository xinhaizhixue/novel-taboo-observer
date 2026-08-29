import DiffMatchPatch from 'diff-match-patch';
import type { ObserverComment, TextAnchor } from '../../src/shared/types.js';
import { hashText } from './utils.js';

const dmp = new DiffMatchPatch();

export function makeAnchor(filePath: string, content: string, snapshotId: string, snapshotHash: string, proposed: { quote: string; start: number; end: number }): TextAnchor | null {
  let { start, end, quote } = proposed;
  if (!quote) return null;
  if (content.slice(start, end) !== quote) {
    start = content.indexOf(quote);
    if (start === -1) return null;
    end = start + quote.length;
  }
  return { filePath, start, end, quote, prefix: content.slice(Math.max(0, start - 48), start), suffix: content.slice(end, end + 48), snapshotId, snapshotHash };
}

function occurrences(content: string, quote: string) {
  const result: number[] = [];
  let cursor = 0;
  while (cursor <= content.length) {
    const found = content.indexOf(quote, cursor);
    if (found === -1) break;
    result.push(found);
    cursor = found + Math.max(1, quote.length);
  }
  return result;
}

function contextScore(content: string, position: number, anchor: TextAnchor) {
  const prefix = content.slice(Math.max(0, position - anchor.prefix.length), position);
  const suffix = content.slice(position + anchor.quote.length, position + anchor.quote.length + anchor.suffix.length);
  const prefixMatch = anchor.prefix ? dmp.match_main(prefix, anchor.prefix, 0) === 0 : true;
  const suffixMatch = anchor.suffix ? dmp.match_main(suffix, anchor.suffix, 0) === 0 : true;
  return (prefixMatch ? 2 : 0) + (suffixMatch ? 2 : 0) - Math.abs(position - anchor.start) / Math.max(1, content.length);
}

export function relocateComment(comment: ObserverComment, content: string): ObserverComment {
  const currentHash = hashText(content);
  if (comment.anchor.snapshotHash === currentHash || comment.anchor.currentHash === currentHash) return comment;
  const locations = occurrences(content, comment.anchor.quote);
  if (!locations.length) return { ...comment, status: comment.status === 'resolved' || comment.status === 'intentional' ? comment.status : 'stale', updatedAt: new Date().toISOString() };
  const best = locations.sort((a, b) => contextScore(content, b, comment.anchor) - contextScore(content, a, comment.anchor))[0];
  return {
    ...comment,
    anchor: { ...comment.anchor, start: best, end: best + comment.anchor.quote.length, currentHash },
    updatedAt: new Date().toISOString()
  };
}
