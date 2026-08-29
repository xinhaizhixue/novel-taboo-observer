import { describe, expect, it } from 'vitest';
import { observerPrompt } from '../electron/main/agents/prompts.js';
import { hashText } from '../electron/main/utils.js';
import type { ContextPack } from '../src/shared/types.js';

describe('Observer 通用审查边界', () => {
  it('要求逐项核对能力触发、距离、代价、阶段与可接触信息', () => {
    const content = '主角隔着匿名远程页面看见了陌生人身上的印记。';
    const contextPack: ContextPack = {
      id: 'context-ability',
      createdAt: '2026-08-30T00:00:00.000Z',
      task: '检查能力边界',
      budget: 1000,
      characters: 100,
      items: [],
      gaps: []
    };
    const prompt = observerPrompt({
      adapterId: 'codex',
      mode: 'manual',
      contextPack,
      snapshot: { id: 'snapshot-ability', filePath: 'manuscript/第十章.md', content, hash: hashText(content), editorVersion: 1, createdAt: '2026-08-30T00:00:00.000Z' }
    });

    expect(prompt).toContain('触发条件、作用距离、代价、已解锁阶段');
    expect(prompt).toContain('匿名界面、远程文件或他人口述不会自动成为');
    expect(prompt).toContain('能力边界或知识边界');
  });

  it('遇到跨章汇总数据时要求只读溯源而不自造统计口径', () => {
    const content = '近三十日战绩：四场两胜一负，医疗终止一场。';
    const prompt = observerPrompt({
      adapterId: 'codex',
      mode: 'manual',
      snapshot: { id: 'snapshot-continuity', filePath: 'manuscript/第五十一章.md', content, hash: hashText(content), editorVersion: 1, createdAt: '2026-08-30T00:00:00.000Z' }
    });

    expect(prompt).toContain('场次/胜负');
    expect(prompt).toContain('只读仓库搜索');
    expect(prompt).toContain('正文、正典、规划和结构化事实');
    expect(prompt).toContain('不得自行发明新口径补洞');
  });
});
