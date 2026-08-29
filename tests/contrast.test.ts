import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function rgb(hex: string) { return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255); }
function luminance(hex: string) {
  const [red, green, blue] = rgb(hex).map((value) => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * red + .7152 * green + .0722 * blue;
}
function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}

describe('全局文字对比度', () => {
  it('正文、次要文字和主按钮颜色达到普通文本4.5:1', async () => {
    const css = await readFile(path.resolve('src/styles.css'), 'utf8');
    const token = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1] || '';
    expect(contrast(token('ink'), token('paper'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('muted'), token('paper'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('muted'), token('panel'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#fff8ee', token('accent'))).toBeGreaterThanOrEqual(4.5);
    expect(css).toContain('body { color: var(--ink);');
  });

  it('启动占位色只作用于boot-screen，不污染真实应用正文', async () => {
    const html = await readFile(path.resolve('index.html'), 'utf8');
    expect(html).not.toMatch(/body\s*\{[^}]*color:\s*#e7dfd0/);
    expect(html).toMatch(/\.boot-screen\s*\{[^}]*color:\s*#e7dfd0/);
    expect(html).toContain("worker-src 'self' blob:");
  });
});
