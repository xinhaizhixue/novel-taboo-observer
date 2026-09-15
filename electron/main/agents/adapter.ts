import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { AgentAdapterInfo, AgentEvent } from '../../../src/shared/types.js';

export interface AdapterRunOptions {
  pureText?: boolean;
  model?: string;
  taskId: string;
  root: string;
  prompt: string;
  readOnly: boolean;
  schemaPath?: string;
  outputPath: string;
  sessionId?: string;
  env?: NodeJS.ProcessEnv;
  /** Maximum time to wait for the first meaningful model output before terminating a stuck startup. */
  startupTimeoutMs?: number;
  /** Use a latency-oriented reasoning level for roles such as Observer without changing global Agent settings. */
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh';
  /** Isolate read-only roles from unrelated user MCP/plugin configuration while preserving Agent authentication. */
  ignoreUserConfig?: boolean;
  /** Grant network access only for the current task when the adapter supports a scoped override. */
  networkAccess?: boolean;
  /** Persist raw CLI output as it arrives so diagnostics survive a crash or forced stop. */
  recordRaw?: (line: string) => void;
  /** Surface a resumable session as soon as the CLI announces it, before the process exits. */
  onSessionId?: (sessionId: string) => void;
  emit: (event: AgentEvent) => void;
}

export interface AdapterRunResult {
  process: ChildProcessWithoutNullStreams;
  completed: Promise<{ sessionId?: string; finalMessage: string; exitCode: number; raw: string[] }>;
}

export interface AgentAdapter {
  readonly id: AgentAdapterInfo['id'];
  info(): Promise<AgentAdapterInfo>;
  run(options: AdapterRunOptions): AdapterRunResult;
}
