import { describe, expect, it } from 'vitest';
import { currentTaskForAgent } from '../src/lib/agent-task.js';
import type { CreativeTask } from '../src/shared/types.js';

const base: CreativeTask = {
  id: 'task-chapter-7', title: '完成第7章《右手还剩四成》', description: '', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'author', priority: 'high', whyNow: '', known: [], missingDecisions: [], aiPreAnalysis: '', authorDecision: '', agentWork: '', completionCriteria: ['2800—3300个非空白字符', '保持医疗权限边界'], links: ['manuscript/第7章.md'], dependencies: [], createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z'
};

describe('Agent复用正式创作任务', () => {
  it('Writer目标与当前写作任务同名时复用原任务和完整完成条件', () => {
    expect(currentTaskForAgent([base], 'writer', ` ${base.title} `)).toBe(base);
  });

  it('不同角色、不同标题或非now任务不会误复用', () => {
    expect(currentTaskForAgent([base], 'observer', base.title)).toBeUndefined();
    expect(currentTaskForAgent([base], 'writer', '写另一章')).toBeUndefined();
    expect(currentTaskForAgent([{ ...base, status: 'next' }], 'writer', base.title)).toBeUndefined();
  });
});
