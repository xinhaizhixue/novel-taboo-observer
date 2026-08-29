import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { GitDiff, GitFileStatus, GitStatus, ProjectFile } from '../../src/shared/types.js';
import { exec, exists, safeRelative } from './utils.js';

function category(file: string): ProjectFile['category'] {
  if (file.startsWith('manuscript/')) return 'manuscript';
  if (file.startsWith('canon/')) return 'canon';
  if (file.startsWith('planning/')) return 'planning';
  if (file.startsWith('research/')) return 'research';
  if (file.startsWith('decisions/')) return 'decision';
  if (file.startsWith('.novel/')) return 'system';
  return 'other';
}

export class GitService {
  constructor(private readonly root: string) {}

  async ensureRepository() {
    if (!(await exists(path.join(this.root, '.git')))) await exec('git', ['init'], this.root);
    const top = (await exec('git', ['rev-parse', '--show-toplevel'], this.root)).stdout.trim();
    if (await realpath(top) !== await realpath(this.root)) throw new Error('请选择 Git 仓库根目录，而不是其子目录');
  }

  async status(): Promise<GitStatus> {
    await this.ensureRepository();
    const { stdout } = await exec('git', ['status', '--porcelain=v1', '-b', '-z', '--untracked-files=all'], this.root);
    const parts = stdout.split('\0').filter(Boolean);
    const header = parts.shift() ?? '## HEAD';
    const descriptor = header.replace(/^##\s*/, '');
    const branch = descriptor.match(/^(?:No commits yet on |Initial commit on )(.+)$/)?.[1] ?? descriptor.split(/[. ]/)[0] ?? 'HEAD';
    const ahead = Number(descriptor.match(/ahead (\d+)/)?.[1] ?? 0);
    const behind = Number(descriptor.match(/behind (\d+)/)?.[1] ?? 0);
    const files: GitFileStatus[] = [];
    for (let index = 0; index < parts.length; index += 1) {
      const record = parts[index];
      const code = record.slice(0, 2);
      let file = record.slice(3);
      if ((code[0] === 'R' || code[0] === 'C') && parts[index + 1]) file = parts[++index];
      files.push({ path: file, index: code[0], workingTree: code[1], category: category(file), origin: 'unknown' });
    }
    return { branch, ahead, behind, files, clean: files.length === 0 };
  }

  async info() {
    const status = await this.status();
    const remote = (await exec('git', ['remote', 'get-url', 'origin'], this.root).catch(() => ({ stdout: '', stderr: '' }))).stdout.trim() || undefined;
    const head = (await exec('git', ['rev-parse', '--short', 'HEAD'], this.root).catch(() => ({ stdout: '', stderr: '' }))).stdout.trim() || undefined;
    return { root: this.root, branch: status.branch, remote, head, clean: status.clean, changedFiles: status.files.length };
  }

  async versions(requestedPath: string) {
    const relative = safeRelative(this.root, requestedPath);
    const target = path.join(this.root, relative);
    const currentBuffer = await readFile(target).catch(() => undefined);
    const newExists = Boolean(currentBuffer);
    const newContent = currentBuffer?.toString('utf8') ?? '';
    const oldResult = await exec('git', ['show', `HEAD:${relative}`], this.root).catch(() => undefined);
    const oldExists = Boolean(oldResult);
    const oldContent = oldResult?.stdout ?? '';
    const binary = Boolean(currentBuffer?.includes(0)) || oldContent.includes('\0');
    return { path: relative, oldContent, newContent, oldExists, newExists, binary };
  }

  async diff(requestedPath?: string, staged = false): Promise<GitDiff[]> {
    const args = ['diff', '--no-ext-diff', '--no-color', '--find-renames'];
    if (staged) args.push('--cached');
    if (requestedPath) args.push('--', requestedPath);
    const { stdout } = await exec('git', args, this.root);
    if (!stdout && requestedPath) {
      const status = await this.status();
      if (status.files.some((item) => item.path === requestedPath && item.index === '?')) {
        const untracked = (await exec('git', ['diff', '--no-index', '--', '/dev/null', requestedPath], this.root).catch((error) => {
          return { stdout: (error as { stdout?: string }).stdout ?? '', stderr: '' };
        })).stdout;
        return [{ path: requestedPath, patch: untracked, staged: false, binary: untracked.includes('Binary files') }];
      }
    }
    const chunks = stdout ? stdout.split(/(?=^diff --git )/m).filter(Boolean) : [];
    return chunks.map((patchText) => {
      const match = patchText.match(/^diff --git a\/(.+?) b\/(.+)$/m);
      const file = match?.[2] ?? requestedPath ?? '';
      return { path: file, patch: patchText, staged, binary: patchText.includes('Binary files') || patchText.includes('GIT binary patch') };
    });
  }

  async commit(message: string, paths: string[], explicitAuthorization: true) {
    if (explicitAuthorization !== true) throw new Error('Git 提交需要作者明确授权');
    const cleanPaths = [...new Set(paths.filter(Boolean))];
    if (!cleanPaths.length) throw new Error('请明确选择本次提交包含的文件');
    await exec('git', ['add', '--', ...cleanPaths], this.root);
    await exec('git', ['commit', '-m', message.trim(), '--', ...cleanPaths], this.root);
    const hash = (await exec('git', ['rev-parse', 'HEAD'], this.root)).stdout.trim();
    const summary = (await exec('git', ['show', '--stat', '--oneline', '--format=%h %s', 'HEAD'], this.root)).stdout.trim();
    return { hash, summary };
  }
}
