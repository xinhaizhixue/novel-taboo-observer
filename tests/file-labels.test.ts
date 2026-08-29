import { describe, expect, it } from 'vitest';
import { fileCharacterLabel } from '../src/lib/file-labels.js';

describe('编辑器字数语义', () => {
  it('按正文、规划、研究、设定与决定显示对应名称', () => {
    expect(fileCharacterLabel('manuscript')).toBe('本章');
    expect(fileCharacterLabel('planning')).toBe('本规划');
    expect(fileCharacterLabel('research')).toBe('本资料');
    expect(fileCharacterLabel('canon')).toBe('本设定');
    expect(fileCharacterLabel('decision')).toBe('本决定');
  });

  it('系统与未知文件使用通用标签', () => {
    expect(fileCharacterLabel('system')).toBe('当前文件');
    expect(fileCharacterLabel('other')).toBe('当前文件');
    expect(fileCharacterLabel()).toBe('当前文件');
  });
});
