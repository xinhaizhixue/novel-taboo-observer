import type { AnalysisSnapshot, ReviewQuoteNormalization } from '../../src/shared/types.js';

/** Strip presentation delimiters only when the inner text is an exact source substring. */
export function normalizeReviewQuotes<T>(value: T, sources: Pick<AnalysisSnapshot, 'filePath' | 'content'>[], phase: ReviewQuoteNormalization['phase']) {
  const normalizations: ReviewQuoteNormalization[] = [];
  const pairs = [['“', '”'], ['‘', '’'], ['"', '"'], ["'", "'"]];
  const walk = (node: unknown, inheritedPath?: string): unknown => {
    if (Array.isArray(node)) return node.map((item) => walk(item, inheritedPath));
    if (!node || typeof node !== 'object') return node;
    const row = node as Record<string, unknown>;
    const filePath = typeof row.filePath === 'string' ? row.filePath : inheritedPath;
    const result = Object.fromEntries(Object.entries(row).map(([key, item]) => [key, walk(item, filePath)]));
    const source = sources.find((item) => item.filePath === filePath);
    if (source && typeof row.quote === 'string' && row.quote.trim() && !source.content.includes(row.quote)) {
      for (const [open, close] of pairs) {
        if (!row.quote.startsWith(open) || !row.quote.endsWith(close)) continue;
        const inner = row.quote.slice(open.length, -close.length);
        if (!inner.trim() || !source.content.includes(inner)) continue;
        result.quote = inner;
        normalizations.push({ filePath: source.filePath, originalQuote: row.quote, quote: inner, phase });
        break;
      }
    }
    return result;
  };
  return { value: walk(value) as T, normalizations };
}
