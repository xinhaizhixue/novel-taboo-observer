import { describe, expect, it } from 'vitest';
import { REQUIRED_UI_STEPS, validateUiAcceptanceEvidence } from '../scripts/ui-acceptance-evidence.js';

const now = new Date('2026-08-29T10:00:00.000Z');
const root = '/tmp/novel-ui-evidence';

function evidence() {
  return {
    schemaVersion: 1 as const,
    mode: 'author-ui-writing-flow' as const,
    surface: 'macOS Electron',
    repositoryRoot: root,
    observedAt: '2026-08-29T09:50:00.000Z',
    steps: REQUIRED_UI_STEPS['author-ui-writing-flow'].map((id) => ({ id, status: 'passed' as const, evidence: `${id} 已在可见窗口完成` })),
    screenshots: [{ path: '/tmp/author-ui.png', label: '作者流程完成态' }]
  };
}

describe('UI验收证据门禁', () => {
  it('完整的新鲜证据可以通过', () => {
    expect(validateUiAcceptanceEvidence(evidence(), { mode: 'author-ui-writing-flow', repositoryRoot: root, now }).steps).toHaveLength(8);
  });

  it('缺少步骤或存在失败步骤时拒绝生成通过回执', () => {
    const missing = evidence();
    missing.steps = missing.steps.filter((step) => step.id !== 'git-diff');
    expect(() => validateUiAcceptanceEvidence(missing, { mode: 'author-ui-writing-flow', repositoryRoot: root, now })).toThrow('UI验收缺少步骤：git-diff');
    const failed = evidence();
    failed.steps = failed.steps.map((step) => step.id === 'save' ? { ...step, status: 'failed' as const } : step);
    expect(() => validateUiAcceptanceEvidence(failed, { mode: 'author-ui-writing-flow', repositoryRoot: root, now })).toThrow('UI验收尚未通过：save');
  });

  it('拒绝其他仓库、陈旧时间或无截图的证据', () => {
    expect(() => validateUiAcceptanceEvidence({ ...evidence(), repositoryRoot: '/tmp/other' }, { mode: 'author-ui-writing-flow', repositoryRoot: root, now })).toThrow('不属于当前作品仓库');
    expect(() => validateUiAcceptanceEvidence({ ...evidence(), observedAt: '2026-08-27T09:50:00.000Z' }, { mode: 'author-ui-writing-flow', repositoryRoot: root, now })).toThrow('超过24小时');
    expect(() => validateUiAcceptanceEvidence({ ...evidence(), screenshots: [] }, { mode: 'author-ui-writing-flow', repositoryRoot: root, now })).toThrow('至少需要一张');
  });
});
