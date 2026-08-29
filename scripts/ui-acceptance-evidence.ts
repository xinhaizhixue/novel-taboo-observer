import path from 'node:path';

export const UI_ACCEPTANCE_MODES = [
  'dev-web-interaction',
  'desktop-macos-ui',
  'author-ui-writing-flow',
  'platform-deep-ui',
  'usability-lifecycle-v2',
  'content-lifecycle-v3'
] as const;

export type UiAcceptanceMode = typeof UI_ACCEPTANCE_MODES[number];

export const REQUIRED_UI_STEPS: Record<UiAcceptanceMode, string[]> = {
  'dev-web-interaction': ['open-url', 'page-navigation', 'scope-boundary', 'no-black-screen'],
  'desktop-macos-ui': ['start-window', 'traffic-lights', 'page-navigation', 'no-black-screen', 'adapter-status'],
  'author-ui-writing-flow': ['open-project', 'natural-sort-navigation', 'chinese-edit', 'scroll-round-trip', 'save', 'observer-run-cancel', 'comment-feedback-review', 'git-diff'],
  'platform-deep-ui': ['cold-start', 'context-customization', 'canon-impact', 'three-way-conflict', 'chapter-search', 'numeric-settings', 'task-editor'],
  'usability-lifecycle-v2': ['project-hub', 'new-project', 'repository-info', 'chapter-delete-restore', 'volume-delete-restore', 'repository-trash', 'git-diff', 'style-crud', 'information-architecture', 'help-onboarding', 'contrast'],
  'content-lifecycle-v3': ['manuscript-delete-restore', 'planning-delete-restore', 'research-delete-restore', 'canon-delete-restore', 'decision-delete-restore', 'nested-directory-delete-restore', 'series-work-delete-restore', 'protected-roots', 'structured-state-semantics']
};

export interface UiAcceptanceEvidence {
  schemaVersion: 1;
  mode: UiAcceptanceMode;
  surface: string;
  repositoryRoot: string;
  observedAt: string;
  steps: Array<{ id: string; status: 'passed' | 'failed'; evidence: string }>;
  screenshots: Array<{ path: string; label: string }>;
  notes?: string[];
}

export function isUiAcceptanceMode(value: string): value is UiAcceptanceMode {
  return (UI_ACCEPTANCE_MODES as readonly string[]).includes(value);
}

export function validateUiAcceptanceEvidence(value: unknown, expected: { mode: UiAcceptanceMode; repositoryRoot: string; now?: Date }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('UI验收证据必须是JSON对象');
  const evidence = value as Partial<UiAcceptanceEvidence>;
  if (evidence.schemaVersion !== 1) throw new Error('UI验收证据schemaVersion必须为1');
  if (evidence.mode !== expected.mode) throw new Error(`UI验收模式不匹配：证据为${String(evidence.mode)}，命令为${expected.mode}`);
  if (!evidence.surface?.trim()) throw new Error('UI验收证据缺少surface');
  if (!evidence.repositoryRoot || path.resolve(evidence.repositoryRoot) !== path.resolve(expected.repositoryRoot)) throw new Error('UI验收证据不属于当前作品仓库');
  const observedAt = Date.parse(evidence.observedAt || '');
  if (!Number.isFinite(observedAt)) throw new Error('UI验收证据observedAt无效');
  const current = (expected.now || new Date()).getTime();
  if (observedAt > current + 5 * 60_000) throw new Error('UI验收证据时间来自未来');
  if (observedAt < current - 24 * 60 * 60_000) throw new Error('UI验收证据超过24小时，请重新执行可见流程');
  if (!Array.isArray(evidence.steps)) throw new Error('UI验收证据缺少steps');
  const ids = evidence.steps.map((step) => step?.id);
  if (new Set(ids).size !== ids.length) throw new Error('UI验收步骤ID重复');
  for (const step of evidence.steps) {
    if (!step || typeof step.id !== 'string' || !step.id.trim()) throw new Error('UI验收步骤缺少ID');
    if (!['passed', 'failed'].includes(step.status)) throw new Error(`UI验收步骤状态无效：${step.id}`);
    if (typeof step.evidence !== 'string' || !step.evidence.trim()) throw new Error(`UI验收步骤缺少可读证据：${step.id}`);
  }
  const byId = new Map(evidence.steps.map((step) => [step.id, step]));
  const missing = REQUIRED_UI_STEPS[expected.mode].filter((id) => !byId.has(id));
  if (missing.length) throw new Error(`UI验收缺少步骤：${missing.join('、')}`);
  const failed = REQUIRED_UI_STEPS[expected.mode].filter((id) => byId.get(id)?.status !== 'passed');
  if (failed.length) throw new Error(`UI验收尚未通过：${failed.join('、')}`);
  if (!Array.isArray(evidence.screenshots) || evidence.screenshots.length === 0) throw new Error('UI验收至少需要一张本次真实界面截图');
  for (const screenshot of evidence.screenshots) {
    if (!screenshot || typeof screenshot.path !== 'string' || !path.isAbsolute(screenshot.path)) throw new Error('UI验收截图必须使用绝对路径');
    if (typeof screenshot.label !== 'string' || !screenshot.label.trim()) throw new Error('UI验收截图缺少说明');
  }
  return evidence as UiAcceptanceEvidence;
}
