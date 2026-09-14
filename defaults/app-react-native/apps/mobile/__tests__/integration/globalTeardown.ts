/// <reference types="node" />
// Stops the API started by globalSetup (its whole process group).
import type { ChildProcess } from 'node:child_process';

export default async function globalTeardown() {
  const api: ChildProcess | undefined = (globalThis as any).__LINKED_API__;
  if (!api?.pid || api.exitCode !== null) return;
  const exited = new Promise((r) => api.once('exit', r));
  try {
    process.kill(-api.pid, 'SIGTERM');
  } catch {
    return;
  }
  const timer = setTimeout(() => {
    try {
      process.kill(-api.pid!, 'SIGKILL');
    } catch {}
  }, 5000);
  await exited;
  clearTimeout(timer);
}
