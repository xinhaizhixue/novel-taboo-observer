import { describe, expect, it } from 'vitest';
import { combineStoryRoutes } from '../electron/main/navigation.js';
import type { StoryRoute } from '../src/shared/types.js';

const routes: StoryRoute[] = [
  { id: 'a', title: '追查来信', pitch: '主动追查', effect: '提高行动感', causalChain: ['拆信', '追踪'], tradeoffs: ['暴露身份'], risks: ['线索过快'], followUpImpact: '进入码头线', requiredSetup: ['旧邮戳'], firstChapterGoal: '抵达码头' },
  { id: 'b', title: '设局试探', pitch: '反向设局', effect: '提高悬疑感', causalChain: ['拆信', '放出假消息'], tradeoffs: ['节奏放缓'], risks: ['主角显得被动'], followUpImpact: '引出内鬼线', requiredSetup: ['知情同伴'] }
];

describe('navigation route decisions', () => {
  it('combines only after an explicit author note and keeps every tradeoff visible', () => {
    const combined = combineStoryRoutes(routes, '以追查为主，用假消息确认跟踪者。', 'combined');
    expect(combined.title).toContain('追查来信 + 设局试探');
    expect(combined.pitch).toBe('以追查为主，用假消息确认跟踪者。');
    expect(combined.causalChain).toEqual(['拆信', '追踪', '放出假消息']);
    expect(combined.tradeoffs).toEqual(['暴露身份', '节奏放缓']);
    expect(combined.requiredSetup).toEqual(['旧邮戳', '知情同伴']);
  });

  it('rejects an implicit or underspecified combination', () => {
    expect(() => combineStoryRoutes(routes.slice(0, 1), '组合', 'combined')).toThrow('至少选择两条');
    expect(() => combineStoryRoutes(routes, '  ', 'combined')).toThrow('需要说明');
  });
});
