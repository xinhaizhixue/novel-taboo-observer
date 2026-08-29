import { spawnSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const major = Number(process.versions.node.split('.')[0]);

function command(candidates: string[], args = ['--version']) {
  for (const candidate of candidates) {
    const result = spawnSync(candidate, args, { encoding: 'utf8' });
    if (result.status === 0) return { command: candidate, version: String(result.stdout || result.stderr).trim() };
  }
  return null;
}

process.stdout.write('\n禁忌观察者 · 环境诊断\n\n');
process.stdout.write(`${major >= 20 ? '✓' : '✗'} Node.js ${process.versions.node}（要求 ≥ 20）\n`);

const git = command(['git']);
process.stdout.write(`${git ? '✓' : '✗'} Git ${git?.version || '未找到'}\n`);

const codex = command([...new Set([process.env.NOVEL_OBSERVER_CODEX_PATH || 'codex', '/Applications/Codex.app/Contents/Resources/codex', '/usr/local/bin/codex', '/opt/homebrew/bin/codex'])]);
process.stdout.write(`${codex ? '✓' : '!'} Codex CLI ${codex?.version || '未找到（可改用其他适配器）'}\n`);

const agentHome = process.env.HOME || '';
const claude = command([...new Set([process.env.NOVEL_OBSERVER_CLAUDE_PATH || 'claude', path.join(agentHome, '.local', 'bin', 'claude'), '/usr/local/bin/claude', '/opt/homebrew/bin/claude'])]);
process.stdout.write(`${claude ? '✓' : '!'} Claude Code ${claude?.version || '未找到（工作台会显示降级）'}\n`);

try { await access(root); process.stdout.write(`✓ 项目目录可读：${root}\n`); } catch { process.stdout.write(`✗ 项目目录不可读：${root}\n`); process.exitCode = 1; }
if (major < 20 || !git) process.exitCode = 1;
process.stdout.write('\n工作台不读取模型 API Key；请在所选 Agent 自己的客户端完成登录。\n\n');
