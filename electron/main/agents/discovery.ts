import { readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/** GUI launches do not inherit an interactive shell's Node version manager PATH. */
export async function cliCandidates(command: string, name: string, env = process.env): Promise<string[]> {
  const home = env.HOME || os.homedir();
  const nvm = path.join(env.NVM_DIR || path.join(home, '.nvm'), 'versions', 'node');
  const versions = await readdir(nvm).catch(() => [] as string[]);
  versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return [...new Set([command, ...String(env.PATH || '').split(path.delimiter).filter(Boolean).map((dir) => path.join(dir, name)),
    path.join(home, '.local/bin', name), path.join(home, '.volta/bin', name), path.join(home, '.asdf/shims', name),
    ...versions.map((version) => path.join(nvm, version, 'bin', name)), '/opt/homebrew/bin/' + name, '/usr/local/bin/' + name])];
}

export function cliEnvironment(command: string, env = process.env): NodeJS.ProcessEnv {
  const directory = path.isAbsolute(command) ? path.dirname(command) : '';
  return { ...env, PATH: [...new Set([directory, ...String(env.PATH || '').split(path.delimiter), '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'].filter(Boolean))].join(path.delimiter) };
}
