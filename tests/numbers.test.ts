import { describe, expect, it } from 'vitest';
import { clampTargetWan, isValidTargetWan, parseTargetWanDraft, targetWanDraftValue } from '../src/lib/numbers.js';

describe('计划篇幅输入', () => {
  it('允许用户先清空旧值再输入新数字，而不是立即强制回填最小值', () => {
    const empty = parseTargetWanDraft('');
    expect(Number.isNaN(empty)).toBe(true);
    expect(targetWanDraftValue(empty)).toBe('');
    expect(parseTargetWanDraft('20')).toBe(20);
    expect(isValidTargetWan(20)).toBe(true);
  });

  it('仅在失焦提交时归一化边界', () => {
    expect(clampTargetWan(Number.NaN)).toBe(5);
    expect(clampTargetWan(2)).toBe(5);
    expect(clampTargetWan(2_000)).toBe(1_000);
  });
});
