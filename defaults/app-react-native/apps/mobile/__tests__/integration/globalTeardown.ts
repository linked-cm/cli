/// <reference types="node" />
// Stops the API started by globalSetup (its whole process group) and removes its exit and signal handlers.
import type { ChildProcess } from 'node:child_process';

type StartedApi = { api: ChildProcess; stop: () => void; killGroup: (signal: NodeJS.Signals) => void };

export default async function globalTeardown() {
  const started: StartedApi | undefined = (globalThis as any).__LINKED_API__;
  if (!started) return;
  const { api, stop, killGroup } = started;
  if (!api.pid || api.exitCode !== null || api.signalCode !== null) {
    stop();
    return;
  }
  const exited = new Promise((r) => api.once('exit', r));
  stop();
  const timer = setTimeout(() => killGroup('SIGKILL'), 5000);
  await exited;
  clearTimeout(timer);
}
