import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import type { AgentAdapterInfo, AgentEvent, JsonValue } from '../../../src/shared/types.js';
import type { AdapterRunOptions, AdapterRunResult, AgentAdapter } from './adapter.js';
import { exec, now } from '../utils.js';

export class ClaudeAdapter implements AgentAdapter {
  readonly id = 'claude' as const;
  private command: string;

  constructor(command = process.env.NOVEL_OBSERVER_CLAUDE_PATH || 'claude', private readonly checkAuthentication = true) {
    this.command = command;
  }

  async info(): Promise<AgentAdapterInfo> {
    const home = process.env.HOME || '';
    for (const candidate of [...new Set([this.command, path.join(home, '.local', 'bin', 'claude'), '/usr/local/bin/claude', '/opt/homebrew/bin/claude'])]) {
      try {
        const { stdout } = await exec(candidate, ['--version']);
        this.command = candidate;
      if (this.checkAuthentication && !process.env.ANTHROPIC_API_KEY) {
        try {
          const auth = JSON.parse((await exec(candidate, ['auth', 'status', '--json'])).stdout) as { loggedIn?: boolean; authMethod?: string };
          if (!auth.loggedIn) throw new Error('not logged in');
        } catch {
          return {
            id: 'claude', name: 'Claude Code', command: candidate, available: false, version: stdout.trim(), authenticated: false, checkedAt: now(),
            reason: '已找到 Claude Code，但尚未登录。请先在Claude Code中完成登录；工作台不会保存凭据。',
            capabilities: { persistentSession: true, resumeSession: true, appendMessage: false, cancel: true, structuredOutput: false, fileModification: true, interAgentMessaging: false, approvalEvents: false, usage: true }
          };
        }
      }
      return {
        id: 'claude', name: 'Claude Code', command: candidate, available: true, version: stdout.trim(),
        authenticated: true, checkedAt: now(),
        capabilities: { persistentSession: true, resumeSession: true, appendMessage: false, cancel: true, structuredOutput: false, fileModification: true, interAgentMessaging: false, approvalEvents: false, usage: true }
      };
      } catch { /* Try known user and package-manager locations. */ }
    }
    return {
      id: 'claude', name: 'Claude Code', command: this.command, available: false, reason: '未找到 Claude Code CLI；适配器已注册，当前功能会明确降级。',
      capabilities: { persistentSession: false, resumeSession: false, appendMessage: false, cancel: false, structuredOutput: false, fileModification: false, interAgentMessaging: false, approvalEvents: false, usage: false }
    };
  }

  run(options: AdapterRunOptions): AdapterRunResult {
    const args = [
      '-p', options.prompt,
      '--output-format', 'stream-json', '--verbose',
      '--permission-mode', options.readOnly ? 'plan' : 'acceptEdits',
      ...(options.sessionId ? ['--resume', options.sessionId] : [])
    ];
    const child = spawn(this.command, args, { cwd: options.root, env: options.env ?? process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.end();
    const raw: string[] = [];
    let buffer = '';
    let sessionId = options.sessionId;
    let finalMessage = '';
    let meaningfulOutput = false;
    let forcedExitCode: number | undefined;
    const startupTimeoutMs = options.startupTimeoutMs ?? 300_000;
    const rememberRaw = (line: string) => { raw.push(line); options.recordRaw?.(line); };
    const startupTimer = setTimeout(() => {
      if (meaningfulOutput || child.exitCode !== null) return;
      forcedExitCode = 124;
      const message = `Agent 启动超过 ${Math.round(startupTimeoutMs / 1000)} 秒仍没有模型输出，工作台已停止本次任务。`;
      rememberRaw(message);
      options.emit({ taskId: options.taskId, type: 'error', at: now(), payload: message });
      child.kill('SIGTERM');
    }, startupTimeoutMs);
    const publish = (line: string) => {
      if (!line.trim()) return;
      rememberRaw(line);
      try {
        const event = JSON.parse(line) as Record<string, unknown>;
        const announcedSessionId = String(event.session_id ?? '') || undefined;
        if (announcedSessionId && announcedSessionId !== sessionId) {
          sessionId = announcedSessionId;
          options.onSessionId?.(announcedSessionId);
        }
        if (event.type === 'result') finalMessage = String(event.result ?? finalMessage);
        const payload = JSON.parse(JSON.stringify(event)) as JsonValue;
        const type: AgentEvent['type'] = event.type === 'assistant' ? 'message' : event.type === 'result' ? 'state' : 'raw';
        if (event.type === 'assistant' || event.type === 'result') { meaningfulOutput = true; clearTimeout(startupTimer); }
        options.emit({ taskId: options.taskId, type, at: now(), payload });
      } catch { options.emit({ taskId: options.taskId, type: 'raw', at: now(), payload: line }); }
    };
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(publish);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const message = chunk.toString();
      rememberRaw(message);
      options.emit({ taskId: options.taskId, type: 'raw', at: now(), payload: message });
    });
    const completed = new Promise<{ sessionId?: string; finalMessage: string; exitCode: number; raw: string[] }>((resolve, reject) => {
      child.on('error', (error) => { clearTimeout(startupTimer); reject(error); });
      child.on('close', async (code, signal) => {
        clearTimeout(startupTimer);
        if (buffer) publish(buffer);
        try { if (!finalMessage) finalMessage = await readFile(options.outputPath, 'utf8'); } catch { /* optional */ }
        resolve({ sessionId, finalMessage, exitCode: forcedExitCode ?? (signal === 'SIGTERM' ? 143 : code ?? 1), raw });
      });
    });
    return { process: child, completed };
  }
}
