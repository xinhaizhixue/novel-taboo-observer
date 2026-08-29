import { describe, expect, it } from 'vitest';
import type { ObserverComment } from '../src/shared/types.js';
import { makeAnchor, relocateComment } from '../electron/main/observer.js';
import { hashText } from '../electron/main/utils.js';

function comment(content: string, quote: string): ObserverComment {
  const start = content.indexOf(quote);
  return {
    id: 'OBS-1', issueType: '连续性', severity: 'warning', summary: '测试', evidence: '测试', suggestedAction: '测试', status: 'open', reviewCount: 0, messages: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    anchor: makeAnchor('manuscript/第一章.md', content, 'snapshot-1', hashText(content), { quote, start, end: start + quote.length })!
  };
}

describe('Observer 不可变快照锚点', () => {
  it('前文增删后只在原引文仍逐字存在时重新定位', () => {
    const original = '门外没有人。\n\n他仍然听见了敲门声。';
    const current = '钟停在凌晨三点。\n\n门外没有人。\n\n他仍然听见了敲门声。';
    const relocated = relocateComment(comment(original, '门外没有人。'), current);
    expect(relocated.status).toBe('open');
    expect(relocated.anchor.start).toBe(current.indexOf('门外没有人。'));
  });

  it('目标文字被重写后必须标记过期，不能冒充当前意见', () => {
    const original = '门外没有人。\n\n他仍然听见了敲门声。';
    const current = '门外站着一个浑身湿透的孩子。';
    const relocated = relocateComment(comment(original, '门外没有人。'), current);
    expect(relocated.status).toBe('stale');
    expect(relocated.anchor.quote).toBe('门外没有人。');
  });
});
