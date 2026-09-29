import { describe, expect, it } from 'vitest';
import { auditPlanning, hasDraftedChapter, STORY_PLAN_TEMPLATE } from '../src/shared/planning-audit.js';

describe('全书路线提醒', () => {
  it('新建作品的空模板不会冒充已完成大纲', () => {
    const audit = auditPlanning([{ path: 'planning/全书路线.md', content: STORY_PLAN_TEMPLATE }]);
    expect(audit.items.every((item) => item.status === 'missing')).toBe(true);
    expect(audit.attention).toHaveLength(6);
  });

  it('一段较长的开书灵感不能冒充终局', () => {
    const audit = auditPlanning([{ path: 'planning/滚动规划.md', content: '# 滚动规划\n\n## 全书方向与结局假设\n\n每晚零点，城市少一条街；主角从一处小小的安全区起步，把迷失的人带回灯下。\n' }]);
    expect(audit.items.find((item) => item.key === 'ending')?.status).toBe('missing');
  });

  it('有开篇和四段骨架时仍指出成长、世界答案与终局缺口', () => {
    const audit = auditPlanning([
      { path: 'canon/故事正典.md', content: '# 故事正典\n\n## 开书状态\n\n末日求生，重点是资源危机与团队抉择。\n\n## 世界\n\n异常海潮的原因未知。\n' },
      { path: 'planning/滚动规划.md', content: '# 滚动规划\n\n## 第一句话承诺\n\n修船工带着幸存者寻找陆地。\n\n## 第一卷：离岸\n\n逃离旧码头，救下同伴并抵达高地。\n\n## 后续长篇骨架\n\n沿河救援 → 高地争夺 → 水上聚落 → 离开旧地图。\n' },
      { path: 'planning/current-plan.md', content: '# 现阶段\n\n## 本轮目标\n\n继续处理粮食、船况和新的航线压力。\n' }
    ]);
    expect(Object.fromEntries(audit.items.map((item) => [item.key, item.status]))).toMatchObject({ promise: 'recorded', growth: 'missing', world: 'missing', arcs: 'skeleton', ending: 'missing', current: 'recorded' });
  });

  it('跨卷规划和明确的无超凡选择都能被识别为有记录', () => {
    const audit = auditPlanning([{ path: 'planning/全书路线.md', content: `# 全书路线

## 作品承诺
每一卷让普通人通过修复基础设施获得一次真实的生存改善。

## 主角成长
主角从修理工成长为能组织多地航路的人，权力越大，责任越重。

## 世界机制与力量路线
明确不设异能或修仙。海潮来自沿岸持续沉降与多轮极端天气。

## 第一卷：离岸
救出同伴，失去旧家园，建立第一个高地落脚点。

## 第二卷：联航
打通两处避难地的补给航线，付出船队分裂的代价。

## 终局与人物收束
主角将航线交给共同维护的联盟，并接受旧船无法再出海。

## 当前卷与近期章节
下一章修复水泵，再交代木料运输造成的冲突。
` }]);
    expect(audit.attention).toEqual([]);
  });

  it('章题和灵感注释不算有正文', () => {
    expect(hasDraftedChapter('# 第33章\n')).toBe(false);
    expect(hasDraftedChapter('# 第一章\n\n<!-- 创作灵感：海潮。 -->\n')).toBe(false);
    expect(hasDraftedChapter('# 第一章\n\n他抓住船舷，等船长第二次打火。码头已经没入水下，岸上的人却还在喊他们回去。他没有回头，先把孩子拉上来。')).toBe(true);
  });
});
