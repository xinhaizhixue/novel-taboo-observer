import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { GitService } from '../electron/main/git.js';
import { atomicWrite, exec } from '../electron/main/utils.js';
import { taskPrompt } from '../electron/main/agents/prompts.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe('作者控制不变量', () => {
  it('Agent 角色提示明确禁止 stage、commit 和 push', () => {
    const prompt = taskPrompt({ adapterId: 'codex', role: 'writer', objective: '续写', scope: ['manuscript/第一章.md'], completionCriteria: ['写完场景'] });
    expect(prompt).toContain('不得执行 git add、git commit、git push');
  });

  it('Researcher 只能写研究资料目录，不能修改正文或正典', () => {
    const prompt = taskPrompt({ adapterId: 'codex', role: 'researcher', objective: '整理离线档案', scope: ['research'], completionCriteria: ['形成资料卡'] });
    expect(prompt).toContain('只能写入以下研究资料范围：research');
    expect(prompt).toContain('不得修改正文、正典、规划或确认决定');
  });

  it('Git 接口没有明确授权时拒绝提交', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-git-'));
    roots.push(root);
    await exec('git', ['init'], root);
    await atomicWrite(path.join(root, 'chapter.md'), '正文\n');
    const git = new GitService(root);
    await expect(git.commit('不应提交', ['chapter.md'], false as true)).rejects.toThrow('明确授权');
  });

  it('明确提交也只包含作者选择的路径，不夹带已暂存文件', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'novel-observer-git-scope-'));
    roots.push(root);
    await exec('git', ['init'], root);
    await exec('git', ['config', 'user.name', 'Novel Observer Test'], root);
    await exec('git', ['config', 'user.email', 'test@example.invalid'], root);
    await atomicWrite(path.join(root, 'selected.md'), '选中\n');
    await atomicWrite(path.join(root, 'unrelated.md'), '无关\n');
    await exec('git', ['add', '--', 'unrelated.md'], root);
    const result = await new GitService(root).commit('只提交选中内容', ['selected.md'], true);
    expect(result.summary).toContain('只提交选中内容');
    const tree = (await exec('git', ['ls-tree', '--name-only', 'HEAD'], root)).stdout;
    expect(tree).toContain('selected.md');
    expect(tree).not.toContain('unrelated.md');
    expect(await readFile(path.join(root, 'unrelated.md'), 'utf8')).toBe('无关\n');
  });
});
