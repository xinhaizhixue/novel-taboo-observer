import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { readdir, readFile, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Settings } from '../../src/shared/types.js';
import { atomicWrite, ensureDir, hashText, now, readJson, uid, writeJson } from './utils.js';

const zip = promisify(gzip);
const unzip = promisify(gunzip);

interface RecoveryEntry {
  id: string;
  repositoryId: string;
  path: string;
  contentHash: string;
  createdAt: string;
  reason: string;
  size: number;
  sessionEnd: boolean;
}

export class RecoveryStore {
  constructor(private readonly base: string, private readonly settings: () => Promise<Settings>) {}

  private repositoryRoot(repositoryId: string) { return path.join(this.base, 'recovery', repositoryId); }
  private indexPath(repositoryId: string) { return path.join(this.repositoryRoot(repositoryId), 'index.json'); }

  async create(repositoryId: string, filePath: string, content: string, reason: string, sessionEnd = false) {
    const contentHash = hashText(content);
    const root = this.repositoryRoot(repositoryId);
    const entries = await readJson<RecoveryEntry[]>(this.indexPath(repositoryId), []);
    const newest = [...entries].reverse().find((item) => item.path === filePath);
    if (newest?.contentHash === contentHash && !sessionEnd) return;
    const blob = path.join(root, 'blobs', `${contentHash}.gz`);
    await ensureDir(path.dirname(blob));
    try { await stat(blob); } catch { await atomicWrite(blob, await zip(Buffer.from(content))); }
    entries.push({ id: uid('recovery'), repositoryId, path: filePath, contentHash, createdAt: now(), reason, size: Buffer.byteLength(content), sessionEnd });
    await writeJson(this.indexPath(repositoryId), entries);
    await this.cleanup(repositoryId);
  }

  async list(repositoryId: string, filePath?: string) {
    const entries = await readJson<RecoveryEntry[]>(this.indexPath(repositoryId), []);
    return entries.filter((item) => !filePath || item.path === filePath).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(({ contentHash: _hash, repositoryId: _repo, sessionEnd: _end, ...item }) => item);
  }

  async restore(repositoryId: string, id: string) {
    const entries = await readJson<RecoveryEntry[]>(this.indexPath(repositoryId), []);
    const entry = entries.find((item) => item.id === id);
    if (!entry) throw new Error('恢复点不存在或已被清理');
    const compressed = await readFile(path.join(this.repositoryRoot(repositoryId), 'blobs', `${entry.contentHash}.gz`));
    return { entry, content: (await unzip(compressed)).toString('utf8') };
  }

  private async cleanup(repositoryId: string) {
    const settings = await this.settings();
    let entries = await readJson<RecoveryEntry[]>(this.indexPath(repositoryId), []);
    const oldestAllowed = Date.now() - settings.recovery.retentionDays * 86_400_000;
    const latestByPath = new Map<string, string>();
    for (const entry of entries) latestByPath.set(entry.path, entry.id);
    const latestSessionEnd = [...entries].reverse().find((item) => item.sessionEnd)?.id;
    const protectedIds = new Set([...latestByPath.values(), ...(latestSessionEnd ? [latestSessionEnd] : [])]);
    entries = entries.filter((entry) => protectedIds.has(entry.id) || Date.parse(entry.createdAt) >= oldestAllowed);
    let total = entries.reduce((sum, item) => sum + item.size, 0);
    for (const entry of [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      if (total <= settings.recovery.perRepositoryBytes) break;
      if (protectedIds.has(entry.id)) continue;
      entries = entries.filter((item) => item.id !== entry.id);
      total -= entry.size;
    }
    await writeJson(this.indexPath(repositoryId), entries);
    await this.removeUnreferencedBlobs(repositoryId, new Set(entries.map((item) => item.contentHash)));
    await this.cleanupGlobal(settings.recovery.globalBytes);
  }

  private async removeUnreferencedBlobs(repositoryId: string, used: Set<string>) {
    const directory = path.join(this.repositoryRoot(repositoryId), 'blobs');
    let files: string[] = [];
    try { files = await readdir(directory); } catch { return; }
    await Promise.all(files.filter((file) => file.endsWith('.gz') && !used.has(file.slice(0, -3))).map((file) => unlink(path.join(directory, file)).catch(() => {})));
  }

  private async cleanupGlobal(limit: number) {
    const root = path.join(this.base, 'recovery');
    let repositories: string[] = [];
    try { repositories = await readdir(root); } catch { return; }
    const all: Array<RecoveryEntry & { index: string }> = [];
    for (const repositoryId of repositories) {
      const index = this.indexPath(repositoryId);
      const entries = await readJson<RecoveryEntry[]>(index, []);
      all.push(...entries.map((entry) => ({ ...entry, index })));
    }
    let total = all.reduce((sum, item) => sum + item.size, 0);
    if (total <= limit) return;
    const byIndex = new Map<string, Array<RecoveryEntry & { index: string }>>();
    for (const item of all) if (!byIndex.has(item.index)) byIndex.set(item.index, all.filter((entry) => entry.index === item.index));
    for (const entry of all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      if (total <= limit) break;
      const group = byIndex.get(entry.index) ?? [];
      const latestForPath = [...group].reverse().find((item) => item.path === entry.path)?.id;
      const latestEnd = [...group].reverse().find((item) => item.sessionEnd)?.id;
      if (entry.id === latestForPath || entry.id === latestEnd) continue;
      byIndex.set(entry.index, group.filter((item) => item.id !== entry.id));
      total -= entry.size;
    }
    for (const [index, entries] of byIndex) {
      await writeJson(index, entries.map(({ index: _index, ...item }) => item));
      await this.removeUnreferencedBlobs(entries[0]?.repositoryId ?? path.basename(path.dirname(index)), new Set(entries.map((item) => item.contentHash)));
    }
  }
}
