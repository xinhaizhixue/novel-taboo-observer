import { describe, expect, it } from 'vitest';
import { currentTaskForAgent, suggestedObjectiveForAgent, suggestedWriterScope, taskObjectiveForAgent } from '../src/lib/agent-task.js';
import type { CreativeTask } from '../src/shared/types.js';

const base: CreativeTask = {
  id: 'task-chapter-7', title: '完成第7章《右手还剩四成》', description: '', level: 'chapter', status: 'now', kind: 'writing', assignee: 'writer', source: 'author', priority: 'high', whyNow: '', known: [], missingDecisions: [], aiPreAnalysis: '', authorDecision: '', agentWork: '', completionCriteria: ['2800—3300个非空白字符', '保持医疗权限边界'], links: ['manuscript/第7章.md'], dependencies: [], createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z'
};

describe('Agent复用正式创作任务', () => {
  it('标题复用任务时把详细说明加入实际目标，作者补充保留在最后', () => {
    const task = { ...base, description: '先读第4—6章。只改第7章，保留已经解决的供水成果。' };
    const draft = `${task.title}\n\n这次重点检查动作和对话。`;
    expect(currentTaskForAgent([task], 'writer', draft)?.id).toBe(task.id);
    const resolved = taskObjectiveForAgent([task], 'writer', draft);
    expect(resolved).toBe(`${task.title}\n\n${task.description}\n\n这次重点检查动作和对话。`);
    expect(taskObjectiveForAgent([task], 'writer', resolved)).toBe(resolved);
    expect(taskObjectiveForAgent([task], 'writer', task.title)).toContain(task.description);
  });

  it('不会把其他任务说明混入新指令，也不会重复自动任务描述里的标题', () => {
    const task = { ...base, description: `${base.title}\n\n完整说明。` };
    expect(taskObjectiveForAgent([task], 'writer', base.title)).toBe(task.description);
    expect(taskObjectiveForAgent([task], 'writer', '写第8章')).toBe('写第8章');
    expect(taskObjectiveForAgent([{ ...task, status: 'completed' }], 'writer', base.title)).toBe(base.title);
  });

  it('三章任务标题能匹配其实际章节，但参考范围不会变成修改目标', () => {
    const task = { ...base, title: '第27—29章：新的航程', links: ['manuscript/第26章.md', 'manuscript/第27章.md', 'manuscript/第28章.md', 'manuscript/第29章.md'] };
    expect(suggestedObjectiveForAgent([task], '', 'writer', 'manuscript/第27章.md')).toBe(task.title);
    expect(suggestedObjectiveForAgent([task], '', 'writer', 'manuscript/第29章.md')).toBe(task.title);
    expect(suggestedObjectiveForAgent([task], '', 'writer', 'manuscript/第26章.md')).toBe('继续完善第26章');
    expect(suggestedObjectiveForAgent([{ ...task, title: '参考第27—29章，续写第30章' }], '', 'writer', 'manuscript/第27章.md')).toBe('继续完善第27章');
    expect(suggestedWriterScope([task], task.title, task.links)).toEqual(['manuscript/第27章.md', 'manuscript/第28章.md', 'manuscript/第29章.md']);
    expect(suggestedWriterScope([{ ...task, status: 'completed' }], task.title, task.links)).toEqual([]);
    expect(suggestedWriterScope([task], '自由填写的其他任务', task.links)).toEqual([]);
  });

  it('Writer目标与当前写作任务同名时复用原任务和完整完成条件', () => {
    expect(currentTaskForAgent([base], 'writer', ` ${base.title} `)).toBe(base);
  });

  it('不同角色、不同标题或非now任务不会误复用', () => {
    expect(currentTaskForAgent([base], 'observer', base.title)).toBeUndefined();
    expect(currentTaskForAgent([base], 'writer', '写另一章')).toBeUndefined();
    expect(currentTaskForAgent([{ ...base, status: 'next' }], 'writer', base.title)).toBeUndefined();
  });

  it('切换正文后不把上一章目标残留到当前Writer范围', () => {
    expect(suggestedObjectiveForAgent([{ ...base, status: 'completed' }], '审查第7章并推进下一章', 'writer', 'manuscript/第8章.md')).toBe('继续完善第8章');
  });

  it('当前任务确实指向所选正文时使用正式任务标题', () => {
    expect(suggestedObjectiveForAgent([base], '审查第6章并推进下一章', 'writer', 'manuscript/第7章.md')).toBe(base.title);
  });

  it('下一章任务只引用当前章作为上下文时不会误导Writer修改当前章', () => {
    const chapterEight = { ...base, id: 'task-chapter-8', title: '完成第8章《谁替你签了名》', links: ['manuscript/第7章.md', 'planning/滚动规划.md'] };
    expect(suggestedObjectiveForAgent([chapterEight], '完成第8章《谁替你签了名》', 'writer', 'manuscript/第7章.md')).toBe('继续完善第7章');
  });

  it('按资料类型给出与当前文件一致的默认目标', () => {
    expect(suggestedObjectiveForAgent([], '', 'researcher', 'research/武器考据.md')).toBe('继续整理武器考据');
    expect(suggestedObjectiveForAgent([], '', 'navigator', 'planning/滚动规划.md')).toBe('检查并完善滚动规划');
    expect(suggestedObjectiveForAgent([], '', 'canon-keeper', 'canon/人物档案.md')).toBe('核查人物档案与当前正文的一致性');
  });
});
