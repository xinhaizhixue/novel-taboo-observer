import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { signalAgent } from './terminate.js';
import { cliCandidates, cliEnvironment } from './discovery.js';
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
    for (const candidate of await cliCandidates(this.command, 'claude')) {
      try {
        const { stdout } = await exec(candidate, ['--version'], undefined, 5_000, cliEnvironment(candidate));
        this.command = candidate;
      if (this.checkAuthentication && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
        try {
          const auth = JSON.parse((await exec(candidate, ['auth', 'status', '--json'], undefined, 8_000, cliEnvironment(candidate))).stdout) as { loggedIn?: boolean; authMethod?: string };
          if (!auth.loggedIn) throw new Error('not logged in');
        } catch (error) {
          const loggedOut = error instanceof Error && error.message === 'not logged in';
          return {
            id: 'claude', name: 'Claude Code', command: candidate, available: false, version: stdout.trim(), authenticated: loggedOut ? false : undefined, checkedAt: now(),
            reason: loggedOut ? '已找到 Claude Code，但尚未登录。请先在 Claude Code 中登录。' : '已找到 Claude Code，但认证状态暂时无法核实。请在终端执行 claude auth status --json 核对登录或网关配置。',
            capabilities: { persistentSession: true, resumeSession: true, appendMessage: false, cancel: true, structuredOutput: false, fileModification: true, interAgentMessaging: false, approvalEvents: false, usage: true }
          };
        }
      }
      return {
        id: 'claude', name: 'Claude Code', command: candidate, available: true, version: stdout.trim(),
        authenticated: true, diagnostic: 'CLI 已找到，认证有效；任务使用 CLI 自身配置', checkedAt: now(),
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
      ...(options.readOnly ? ['--tools', options.pureText ? '' : 'Read,Grep,Glob', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}'] : []),
      ...(options.pureText ? ['--system-prompt', '你是小说文字编辑。仅分析用户提供的正文，直接返回所要求的JSON，不写计划、不调用工具。'] : []),
      ...(options.schemaPath ? ['--json-schema', readFileSync(options.schemaPath, 'utf8')] : []),
      '--output-format', 'stream-json', '--verbose',
      '--permission-mode', options.readOnly ? 'default' : 'acceptEdits',
      ...(options.reasoningEffort ? ['--effort', options.reasoningEffort] : []),
      ...(options.model ? ['--model', options.model] : []),
      ...(options.sessionId ? ['--resume', options.sessionId] : [])
    ];
    const child = spawn(this.command, args, { cwd: options.root, detached: process.platform !== 'win32', env: cliEnvironment(this.command, options.env ?? process.env), stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.end();
    const raw: string[] = [];
    let buffer = '';
    let sessionId = options.sessionId;
    let finalMessage = '';
    let meaningfulOutput = false;
    let forcedExitCode: number | undefined;
    const startupTimeoutMs = options.startupTimeoutMs ?? 300_000;
    const rememberRaw = (line: string) => { raw.push(line); options.recordRaw?.(line); };
    let terminationTimer: ReturnType<typeof setTimeout> | undefined;
    const startupTimer = setTimeout(() => {
      if (meaningfulOutput || child.exitCode !== null) return;
      forcedExitCode = 124;
      const message = `Agent 启动超过 ${Math.round(startupTimeoutMs / 1000)} 秒仍没有模型输出，工作台正在停止本次任务。`;
      rememberRaw(message);
      options.emit({ taskId: options.taskId, type: 'error', at: now(), payload: message });
      signalAgent(child, 'SIGTERM');
      terminationTimer = setTimeout(() => { if (child.exitCode === null) signalAgent(child, 'SIGKILL'); }, 3_000);
      terminationTimer.unref();
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
        if (event.type === 'result') {
          finalMessage = event.structured_output ? JSON.stringify(event.structured_output) : String(event.result ?? finalMessage);
          if (event.is_error) forcedExitCode = 1;
        }
        const payload = JSON.parse(JSON.stringify(event)) as JsonValue;
        const type: AgentEvent['type'] = event.type === 'assistant' ? 'message' : event.type === 'result' ? 'state' : 'raw';
        if (event.type === 'assistant' || event.type === 'result' || (event.type === 'system' && event.subtype === 'thinking_tokens')) { meaningfulOutput = true; clearTimeout(startupTimer); }
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
      child.on('error', (error) => { clearTimeout(startupTimer); clearTimeout(terminationTimer); reject(error); });
      child.on('close', async (code, signal) => {
        clearTimeout(startupTimer); clearTimeout(terminationTimer);
        if (buffer) publish(buffer);
        try { if (!finalMessage) finalMessage = await readFile(options.outputPath, 'utf8'); } catch { /* optional */ }
        resolve({ sessionId, finalMessage, exitCode: forcedExitCode ?? (signal === 'SIGTERM' ? 143 : code ?? 1), raw });
      });
    });
    return { process: child, completed };
  }
}
