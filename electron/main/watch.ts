import chokidar, { type FSWatcher } from 'chokidar';
import path from 'node:path';
import { fileInfo } from './utils.js';

export const WATCHED_PROJECT_ROOTS = ['manuscript', 'planning', 'canon', 'research', 'decisions', '.novel/events'];
const TEXT_EXTENSION = /\.(?:md|markdown|txt)$/i;

export async function watchProjectFiles(root: string, handlers: {
  onFile(change: { path: string; hash: string; content: string }): void;
  onProject(): void;
}) {
  const watcher = chokidar.watch(WATCHED_PROJECT_ROOTS, {
    cwd: root,
    ignoreInitial: true,
    ignored: ['**/.git/**', '**/node_modules/**'],
    awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 50 }
  });
  const changed = async (relativeInput: string) => {
    const relative = relativeInput.split(path.sep).join('/');
    if (relative.startsWith('.novel/events/') && relative.endsWith('.jsonl')) { handlers.onProject(); return; }
    if (!TEXT_EXTENSION.test(relative)) return;
    try {
      const info = await fileInfo(path.join(root, relative));
      handlers.onFile({ path: relative, hash: info.hash, content: info.content });
    } catch { handlers.onProject(); }
  };
  watcher.on('add', changed).on('change', changed).on('unlink', (relativeInput) => {
    const relative = relativeInput.split(path.sep).join('/');
    if (relative.startsWith('.novel/events/')) handlers.onProject();
    else if (TEXT_EXTENSION.test(relative)) handlers.onFile({ path: relative, hash: 'missing', content: '' });
  }).on('addDir', (relativeInput) => {
    const relative = relativeInput.split(path.sep).join('/');
    if (relative.startsWith('.novel/events/')) handlers.onProject();
  });
  await new Promise<void>((resolve, reject) => watcher.once('ready', resolve).once('error', reject));
  return watcher as FSWatcher;
}
