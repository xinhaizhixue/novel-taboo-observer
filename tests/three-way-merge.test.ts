import { describe, expect, it } from 'vitest';
import { mergeThreeWay, renderThreeWayMerge } from '../src/lib/three-way-merge.js';

describe('正文三方合并', () => {
  it('自动合并作者与磁盘互不重叠的修改', () => {
    const base = '第一行\n第二行\n第三行\n';
    const ours = '第一行\n作者修改第二行\n第三行\n';
    const theirs = '第一行\n第二行\nAgent修改第三行\n';
    const merge = mergeThreeWay(base, ours, theirs);
    expect(merge.conflicts).toHaveLength(0);
    expect(renderThreeWayMerge(merge, {})).toBe('第一行\n作者修改第二行\nAgent修改第三行\n');
  });

  it('同一区域的不同修改必须逐段选择', () => {
    const merge = mergeThreeWay('开头\n原句\n结尾\n', '开头\n作者版\n结尾\n', '开头\nAgent版\n结尾\n');
    expect(merge.conflicts).toHaveLength(1);
    const id = merge.conflicts[0].id;
    expect(renderThreeWayMerge(merge, { [id]: 'ours' })).toContain('作者版');
    expect(renderThreeWayMerge(merge, { [id]: 'theirs' })).toContain('Agent版');
    expect(renderThreeWayMerge(merge, { [id]: 'base' })).toContain('原句');
  });

  it('同一位置插入不同内容时不擅自决定顺序', () => {
    const merge = mergeThreeWay('开头\n结尾\n', '开头\n作者插入\n结尾\n', '开头\nAgent插入\n结尾\n');
    expect(merge.conflicts).toHaveLength(1);
  });
});
