import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';

export const now = () => new Date().toISOString();
export const uid = (prefix: string) => `${prefix}-${randomUUID()}`;
export const hashText = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const exists = async (target: string) => access(target).then(() => true, () => false);

export async function ensureDir(target: string) {
  await mkdir(target, { recursive: true });
  return target;
}

export async function atomicWrite(target: string, content: string | Buffer) {
  await ensureDir(path.dirname(target));
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, target);
}

export async function readJson<T>(target: string, fallback?: T): Promise<T> {
  try {
    return JSON.parse(await readFile(target, 'utf8')) as T;
  } catch (error) {
    if (fallback !== undefined && (error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJson(target: string, value: unknown) {
  await atomicWrite(target, `${JSON.stringify(value, null, 2)}\n`);
}

export function safeRelative(root: string, requested: string) {
  const resolved = path.resolve(root, requested);
  const relative = path.relative(root, resolved);
  if (!relative || relative === '.') return '';
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('路径超出当前作品仓库');
  return relative.split(path.sep).join('/');
}

export async function fileInfo(target: string) {
  const info = await stat(target);
  const content = await readFile(target, 'utf8');
  return { content, hash: hashText(content), modifiedAt: info.mtime.toISOString(), size: info.size };
}

export function exec(command: string, args: string[], cwd?: string, timeout = 30_000) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(command, args, { cwd, timeout, maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const wrapped = new Error(String(stderr || stdout || error.message).trim());
        Object.assign(wrapped, { cause: error, code: (error as NodeJS.ErrnoException).code, stdout: String(stdout), stderr: String(stderr) });
        reject(wrapped);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

export function mergeDeep<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && result[key] && typeof result[key] === 'object') {
      result[key] = mergeDeep(result[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else if (value !== undefined) result[key] = value;
  }
  return result as T;
}
