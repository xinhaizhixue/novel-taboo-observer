import { constants as fsConstants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { signalAgent } from './terminate.js';
import os from 'node:os';
import path from 'node:path';
import type { AgentAdapterInfo, AgentEvent, JsonValue } from '../../../src/shared/types.js';
import type { AdapterRunOptions, AdapterRunResult, AgentAdapter } from './adapter.js';
import { exec, now } from '../utils.js';

function payloadFrom(event: unknown): JsonValue {
  try { return JSON.parse(JSON.stringify(event)) as JsonValue; } catch { return String(event); }
}

function collectModelSlugs(value: unknown, result = new Set<string>()) {
  if (Array.isArray(value)) value.forEach((item) => collectModelSlugs(item, result));
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.slug === 'string') result.add(record.slug);
    Object.values(record).forEach((item) => collectModelSlugs(item, result));
  }
  return result;
}

export class CodexAdapter implements AgentAdapter {
  readonly id = 'codex' as const;
  private command: string;
  private models: string[] = [];

  constructor(command = process.env.NOVEL_OBSERVER_CODEX_PATH || 'codex', private readonly checkStateDirectory = true, private readonly stateDirectory = process.env.CODEX_HOME || path.join(os.homedir(), '.codex')) {
    this.command = command;
  }

  private async resolveModels(command: string) {
    if (this.models.length) return;
    try {
      const { stdout } = await exec(command, ['debug', 'models', '--bundled'], undefined, 5_000);
      const available = collectModelSlugs(JSON.parse(stdout));
      this.models = [...available];
    } catch { /* Older Codex versions may not expose a bundled catalog; use their own default. */ }
  }

  async info(): Promise<AgentAdapterInfo> {
    for (const candidate of [...new Set([this.command, '/Applications/Codex.app/Contents/Resources/codex', '/usr/local/bin/codex', '/opt/homebrew/bin/codex'])]) {
      try {
        const { stdout } = await exec(candidate, ['--version']);
        this.command = candidate;
        try {
          const login = await exec(candidate, ['login', 'status']);
          if (this.checkStateDirectory) {
            try { await access(this.stateDirectory, fsConstants.W_OK); } catch {
              return {
                id: 'codex', name: 'Codex CLI', command: candidate, available: false, version: stdout.trim(), authenticated: true, checkedAt: now(),
                reason: `Codex CLI 已登录，但运行状态目录不可写（${this.stateDirectory}）。请从有正常用户目录权限的桌面环境启动；工作台不会把任务标成可运行。`,
                diagnostic: '登录有效；运行前置检查失败：状态目录只读',
                capabilities: { persistentSession: true, resumeSession: true, appendMessage: false, cancel: true, structuredOutput: true, fileModification: true, interAgentMessaging: false, approvalEvents: false, usage: true }
              };
            }
          }
          await this.resolveModels(candidate);
          return {
            id: 'codex', name: 'Codex CLI', command: candidate, available: true, models: this.models, version: stdout.trim(), authenticated: true,
            diagnostic: login.stdout.trim() || login.stderr.trim() || '登录状态正常', checkedAt: now(),
            capabilities: { persistentSession: true, resumeSession: true, appendMessage: false, cancel: true, structuredOutput: true, fileModification: true, interAgentMessaging: false, approvalEvents: false, usage: true }
          };
        } catch {
          return {
            id: 'codex', name: 'Codex CLI', command: candidate, available: false, version: stdout.trim(), authenticated: false, checkedAt: now(),
            reason: '已找到 Codex CLI，但尚未登录。请先在终端执行 codex login；工作台不会保存凭据。',
            capabilities: { persistentSession: true, resumeSession: true, appendMessage: false, cancel: true, structuredOutput: true, fileModification: true, interAgentMessaging: false, approvalEvents: false, usage: true }
          };
        }
      } catch { /* Try known macOS and package-manager locations. */ }
    }
    return {
      id: 'codex', name: 'Codex CLI', command: this.command, available: false, reason: '未找到 Codex CLI。安装并登录后即可使用；工作台不保存登录凭据。',
      capabilities: { persistentSession: false, resumeSession: false, appendMessage: false, cancel: false, structuredOutput: false, fileModification: false, interAgentMessaging: false, approvalEvents: false, usage: false }
    };
  }

  run(options: AdapterRunOptions): AdapterRunResult {
    const runtimeArgs = [
      '--disable', 'chronicle',
      ...(options.ignoreUserConfig ? ['--ignore-user-config'] : []),
      ...(options.model ? ['--model', options.model] : []),
      ...(options.reasoningEffort ? ['-c', `model_reasoning_effort="${options.reasoningEffort}"`] : []),
      ...(options.networkAccess ? ['-c', 'sandbox_workspace_write.network_access=true'] : [])
    ];
    const args = options.sessionId
      ? ['exec', ...runtimeArgs, 'resume', options.sessionId, '--json', ...(options.schemaPath ? ['--output-schema', options.schemaPath] : []), '-o', options.outputPath, '-']
      : ['exec', ...runtimeArgs, '--json', '--color', 'never', '-s', options.readOnly ? 'read-only' : 'workspace-write', '-C', options.root, ...(options.schemaPath ? ['--output-schema', options.schemaPath] : []), '-o', options.outputPath, '-'];
    const child = spawn(this.command, args, { cwd: options.root, detached: process.platform !== 'win32', env: options.env ?? process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.end(options.prompt);
    let buffer = '';
    let sessionId = options.sessionId;
    const raw: string[] = [];
    let meaningfulOutput = false;
    let forcedExitCode: number | undefined;
    let modelRefreshWarningSeen = false;
    const startupTimeoutMs = options.startupTimeoutMs ?? 300_000;
    const rememberRaw = (line: string) => {
      raw.push(line);
      options.recordRaw?.(line);
    };
    const stopForStartupFailure = (message: string, exitCode: number) => {
      if (meaningfulOutput || forcedExitCode !== undefined || child.exitCode !== null) return;
      forcedExitCode = exitCode;
      rememberRaw(message);
      options.emit({ taskId: options.taskId, type: 'error', at: now(), payload: message });
      signalAgent(child, 'SIGTERM');
    };
    const startupTimer = setTimeout(() => stopForStartupFailure(`Agent 启动超过 ${Math.round(startupTimeoutMs / 1000)} 秒仍没有模型输出，工作台已停止本次任务。`, 124), startupTimeoutMs);
    const markMeaningfulOutput = () => {
      meaningfulOutput = true;
      clearTimeout(startupTimer);
    };
    const publishLine = (line: string) => {
      if (!line.trim()) return;
      rememberRaw(line);
      try {
        const event = JSON.parse(line) as Record<string, unknown>;
        const announcedSessionId = String(event.thread_id ?? event.session_id ?? '') || undefined;
        if (announcedSessionId && announcedSessionId !== sessionId) {
          sessionId = announcedSessionId;
          options.onSessionId?.(announcedSessionId);
        }
        const type = String(event.type ?? 'raw');
        let mapped: AgentEvent['type'] = 'raw';
        if (type.includes('error') || type.includes('failed')) mapped = 'error';
        else if ((event.item as { type?: string })?.type === 'file_change') mapped = 'file-change';
        else if (type.includes('command') || (event.item as { type?: string })?.type === 'command_execution') mapped = 'command';
        else if (type.includes('message') || (event.item as { type?: string })?.type === 'agent_message') mapped = 'message';
        else if (type.includes('usage')) mapped = 'usage';
        if (['message', 'command', 'file-change', 'usage'].includes(mapped)) markMeaningfulOutput();
        options.emit({ taskId: options.taskId, type: mapped, at: now(), payload: payloadFrom(event) });
      } catch {
        options.emit({ taskId: options.taskId, type: 'raw', at: now(), payload: line });
      }
    };
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(publishLine);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const message = chunk.toString();
      rememberRaw(message);
      options.emit({ taskId: options.taskId, type: 'raw', at: now(), payload: message });
      if (!meaningfulOutput && /failed to refresh available models:\s*timeout waiting for child process to exit/i.test(message) && !modelRefreshWarningSeen) {
        modelRefreshWarningSeen = true;
        options.emit({ taskId: options.taskId, type: 'message', at: now(), payload: { message: 'Codex 刷新模型目录时超时；该诊断可能是可恢复的，工作台会继续等待实际模型输出，直到启动总超时。' } });
      }
    });
    const completed = new Promise<{ sessionId?: string; finalMessage: string; exitCode: number; raw: string[] }>((resolve, reject) => {
      child.on('error', (error) => { clearTimeout(startupTimer); reject(error); });
      child.on('close', async (code, signal) => {
        clearTimeout(startupTimer);
        if (buffer) publishLine(buffer);
        let finalMessage = '';
        try { finalMessage = await readFile(options.outputPath, 'utf8'); } catch { /* surfaced through exit/raw */ }
        resolve({ sessionId, finalMessage, exitCode: forcedExitCode ?? (signal === 'SIGTERM' ? 143 : code ?? 1), raw });
      });
    });
    return { process: child, completed };
  }
}
