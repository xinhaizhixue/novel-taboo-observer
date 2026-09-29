import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentHub, scopesOverlap } from '../electron/main/agents/hub.js';
import { AuthorProfileStore } from '../electron/main/profile.js';
import { ProjectService } from '../electron/main/project.js';
import type { AgentTaskRecord, ReviewReport } from '../src/shared/types.js';
import type { AgentAdapter } from '../electron/main/agents/adapter.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe('Agent 中断恢复', () => {
  it('全书规划 Agent 的候选保留作品级范围，等待作者选定', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-outline-project-'));
    const appData = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-outline-data-'));
    roots.push(root, appData);
    const project = new ProjectService('outline-session');
    await project.create({ root, title: '路线测试', kind: 'novel' });
    const route = { title: '第一路线', pitch: '先救人，再建立长期安全区。', effect: '阶段回报明确', causalChain: ['救人', '扩建'], tradeoffs: ['需要补给'], risks: ['重复'], followUpImpact: '进入下一卷', requiredSetup: ['第一盏灯'], firstChapterGoal: '救回第一人' };
    const finalMessage = JSON.stringify({ title: '全书路线候选', diagnosis: '尚无大纲', highImpactQuestions: ['终局是什么？'], recommendedGoal: '建议先审议路线', routes: [route, { ...route, title: '第二路线' }] });
    const adapter: AgentAdapter = {
      id: 'codex',
      info: async () => ({ id: 'codex', name: 'Fixture', command: 'fixture', available: true, capabilities: { persistentSession: false, resumeSession: false, appendMessage: false, cancel: true, structuredOutput: true, fileModification: false, interAgentMessaging: false, approvalEvents: false, usage: false } }),
      run: () => ({ process: { kill: () => true } as never, completed: Promise.resolve({ sessionId: 'outline-session', finalMessage, exitCode: 0, raw: [] }) })
    };
    const hub = new AgentHub(appData, project, new AuthorProfileStore(appData), [adapter]);
    const task = await hub.runTask({ adapterId: 'codex', role: 'architect', navigationScope: 'work', objective: '提出全书规划', scope: ['planning', 'canon'], completionCriteria: [] });
    await hub.waitForTask(task.id);
    const state = await project.state();
    expect(state.proposals[0]).toMatchObject({ status: 'pending', planningScope: 'work', title: '全书路线候选' });
    expect(state.proposals[0].routes).toHaveLength(2);
  });

  it('识别目录与子文件的 Writer 修改范围重叠', () => {
    expect(scopesOverlap(['manuscript'], ['manuscript/第一卷/第一章.md'])).toBe(true);
    expect(scopesOverlap(['manuscript/第一卷'], ['manuscript/第二卷'])).toBe(false);
    expect(scopesOverlap(['manuscript/第一章.md'], ['./manuscript/第一章.md'])).toBe(true);
  });

  it('拒绝重叠范围的并发 Writer，同时允许互不重叠的卷并行', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-writer-lock-'));
    const appData = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-writer-lock-data-'));
    roots.push(root, appData);
    const project = new ProjectService('writer-lock-session');
    await project.create({ root, title: 'Writer 门禁', kind: 'novel' });
    const fake: AgentAdapter = {
      id: 'codex',
      info: async () => ({ id: 'codex', name: 'Fake Codex', command: 'fake', available: true, capabilities: { persistentSession: true, resumeSession: true, appendMessage: false, cancel: true, structuredOutput: true, fileModification: true, interAgentMessaging: false, approvalEvents: false, usage: false } }),
      run: () => {
        let finish!: (result: { sessionId?: string; finalMessage: string; exitCode: number; raw: string[] }) => void;
        const completed = new Promise<{ sessionId?: string; finalMessage: string; exitCode: number; raw: string[] }>((resolve) => { finish = resolve; });
        const process = { kill: () => { finish({ sessionId: 'fake-session', finalMessage: '', exitCode: 143, raw: [] }); return true; } };
        return { process: process as never, completed };
      }
    };
    const hub = new AgentHub(appData, project, new AuthorProfileStore(appData), [fake]);
    await hub.runTask({ adapterId: 'codex', role: 'writer', objective: '写第一卷', scope: ['manuscript/第一卷'], completionCriteria: [] });
    await expect(hub.runTask({ adapterId: 'codex', role: 'writer', objective: '重复写第一卷', scope: ['manuscript/第一卷/第一章.md'], completionCriteria: [] })).rejects.toThrow('重叠范围');
    await expect(hub.runTask({ adapterId: 'codex', role: 'writer', objective: '写第二卷', scope: ['manuscript/第二卷'], completionCriteria: [] })).resolves.toMatchObject({ state: 'running' });
    await hub.runTask({ adapterId: 'codex', role: 'memory-curator', objective: '提炼近期风格', scope: ['planning', 'canon'], completionCriteria: [] });
    await expect(hub.runTask({ adapterId: 'codex', role: 'memory-curator', objective: '提炼近期风格', scope: ['planning', 'canon'], completionCriteria: [] })).rejects.toThrow('相同的 memory-curator 任务已经在运行');
    await expect(hub.runTask({ adapterId: 'codex', role: 'researcher', objective: '越权研究', scope: ['manuscript'], completionCriteria: [] })).rejects.toThrow('只允许写入 research');
    await hub.cancelAll();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  it('应用重启后把遗留运行任务标为中断，绝不自动重跑', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-interrupted-project-'));
    const appData = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-interrupted-data-'));
    roots.push(root, appData);
    const project = new ProjectService('first-session');
    await project.create({ root, title: '中断测试', kind: 'novel' });
    const record: AgentTaskRecord = { id: 'agent-running', adapterId: 'codex', role: 'writer', state: 'running', objective: '续写', scope: ['manuscript/第一章.md'], completionCriteria: ['完成场景'], startedAt: new Date().toISOString(), startHashes: {}, changedFiles: [] };
    await project.eventStore.append('agent.task', record as never, 'agent');
    const report: ReviewReport = {
      id: 'review-interrupted', taskId: record.id, scope: 'chapter', status: 'running', primaryFile: 'manuscript/第一章.md', createdAt: record.startedAt,
      summary: '正在逐项审阅；尚无结论。', sources: [], omittedPaths: [], gaps: [], assessments: [], commentIds: [], unanchored: []
    };
    await project.eventStore.append('review.report', report as never, 'observer');
    await project.eventStore.append('review.report', { ...report, id: 'review-no-task', taskId: 'task-not-persisted' } as never, 'observer');

    const reopened = new ProjectService('second-session');
    await reopened.open(root);
    const hub = new AgentHub(appData, reopened, new AuthorProfileStore(appData));
    await hub.reconcileInterrupted();
    const restored = (await reopened.state()).agentTasks.find((item) => item.id === record.id);
    expect(restored?.state).toBe('interrupted');
    expect(restored?.error).toContain('不会自动重跑');
    const reviews = (await reopened.state()).reviews ?? [];
    expect(reviews).toHaveLength(2);
    for (const review of reviews) {
      expect(review.status).toBe('failed');
      expect(review.summary).toContain('未自动重跑');
      expect(review.gaps.join('')).toContain('未获得完整结论');
      expect(review.completedAt).toBeTruthy();
    }
    await hub.reconcileInterrupted();
    expect((await reopened.state()).reviews).toEqual(reviews);
  });
});
