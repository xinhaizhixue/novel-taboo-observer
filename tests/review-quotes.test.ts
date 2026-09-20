import { describe, expect, it } from 'vitest';
import { normalizeReviewQuotes } from '../electron/main/review-quotes.js';

const sources = [
  { filePath: 'manuscript/第1章.md', content: '她说：“请把水杯放在桌上，等风停了再走。”\n他推开了门。' },
  { filePath: 'manuscript/第2章.md', content: '院里的灯灭了。' }
];

describe('审阅引用的展示引号', () => {
  it('保留已经逐字匹配的引号，只处理可在同一快照中逐字找到的内部文字', () => {
    const original = { readings: [{ filePath: sources[0].filePath, quote: '“请把水杯放在桌上，等风停了再走。”', frictions: [{ quote: '“等风停了再走。”', difficulty: '待复核', suggestion: '核对上下文' }] }] };
    const result = normalizeReviewQuotes(original, sources, 'reading');
    expect(result.value.readings[0].quote).toBe(original.readings[0].quote);
    expect(result.value.readings[0].frictions[0].quote).toBe('等风停了再走。');
    expect(original.readings[0].frictions[0].quote).toBe('“等风停了再走。”');
    expect(result.normalizations).toEqual([{ filePath: sources[0].filePath, originalQuote: '“等风停了再走。”', quote: '等风停了再走。', phase: 'reading' }]);
    expect(normalizeReviewQuotes(result.value, sources, 'reading').normalizations).toEqual([]);
  });

  it('错字、错章、内部空白变化和不成对引号仍不能通过引用核对', () => {
    const evidence = [
      { filePath: sources[0].filePath, quote: '“等雨停了再走。”' },
      { filePath: sources[0].filePath, quote: '“院里的灯灭了。”' },
      { filePath: sources[0].filePath, quote: '“他 推开了门。”' },
      { filePath: sources[0].filePath, quote: '“他推开了门。' }
    ];
    expect(normalizeReviewQuotes({ evidence }, sources, 'context')).toEqual({ value: { evidence }, normalizations: [] });
  });

  it('证据的文件路径优先于父级路径，引用内容以外的文字保持原样', () => {
    const input = { filePath: sources[0].filePath, summary: '“保持作者表述”', evidence: [{ filePath: sources[1].filePath, quote: '"院里的灯灭了。"' }] };
    const result = normalizeReviewQuotes(input, sources, 'context');
    expect(result.value.summary).toBe(input.summary);
    expect(result.value.evidence[0].quote).toBe(sources[1].content);
    expect(result.normalizations[0].filePath).toBe(sources[1].filePath);
  });
});
