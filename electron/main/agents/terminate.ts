import type { ChildProcessWithoutNullStreams } from 'node:child_process';

/** Adapters spawn their own POSIX process group so CLI descendants stop too. */
export function signalAgent(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals) {
  if (process.platform !== 'win32' && child.pid) {
    try { process.kill(-child.pid, signal); return; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
  }
  if (child.exitCode == null && child.signalCode == null) child.kill(signal);
}
