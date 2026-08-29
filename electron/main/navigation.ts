import type { StoryRoute } from '../../src/shared/types.js';

export function combineStoryRoutes(routes: StoryRoute[], note: string, id: string): StoryRoute {
  if (routes.length < 2) throw new Error('至少选择两条路线才能组合');
  if (!note.trim()) throw new Error('组合路线需要说明如何取舍与组合');
  return {
    id,
    title: `组合：${routes.map((item) => item.title).join(' + ')}`,
    pitch: note.trim(),
    effect: routes.map((item) => item.effect).filter(Boolean).join('；'),
    causalChain: [...new Set(routes.flatMap((item) => item.causalChain))],
    tradeoffs: [...new Set(routes.flatMap((item) => item.tradeoffs))],
    risks: [...new Set(routes.flatMap((item) => item.risks))],
    followUpImpact: routes.map((item) => item.followUpImpact).filter(Boolean).join('；'),
    requiredSetup: [...new Set(routes.flatMap((item) => item.requiredSetup))],
    firstChapterGoal: routes[0].firstChapterGoal
  };
}
