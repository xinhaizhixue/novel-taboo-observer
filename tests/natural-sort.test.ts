import { describe, expect, it } from 'vitest';
import { compareNaturalPath } from '../src/shared/natural-sort.js';

describe('作者可预期的自然目录顺序', () => {
  it('按中文分卷序号排序，不把第七卷夹在第一卷和第二卷之间', () => {
    const paths = [
      'manuscript/第十卷-尾声/第901章.md',
      'manuscript/第七卷-远征/第469章.md',
      'manuscript/第二卷-武考/第071章.md',
      'manuscript/第一卷-灰炉/第001章.md'
    ];
    expect(paths.sort(compareNaturalPath)).toEqual([
      'manuscript/第一卷-灰炉/第001章.md',
      'manuscript/第二卷-武考/第071章.md',
      'manuscript/第七卷-远征/第469章.md',
      'manuscript/第十卷-尾声/第901章.md'
    ]);
  });

  it('同时理解中文章号、补零阿拉伯章号与百位章号', () => {
    const names = ['第一百零二章.md', '第010章.md', '第二章.md', '第1章.md', '第十一章.md'];
    expect(names.sort(compareNaturalPath)).toEqual(['第1章.md', '第二章.md', '第010章.md', '第十一章.md', '第一百零二章.md']);
  });
});
