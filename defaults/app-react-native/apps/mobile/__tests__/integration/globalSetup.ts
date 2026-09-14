/// <reference types="node" />
// Before the integration tests: check that the target is this repo's Compose Fuseki, reset the in-memory test
// dataset, start the API-only backend.
import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { API_PORT, API_URL, FUSEKI_DATASET, apiDir, readApiEnvFile, repoRoot, resolveFusekiEnv } from './apiEnv';

// The variables that select S3FileStore (services/api/src/fileStoreEnv.ts); blanked even when unset anywhere.
const S3_ENV_KEYS = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET_ENDPOINT', 'S3_FILES_BUCKET_NAME'];

// Test hooks: INTEGRATION_API_BIN replaces `linked` (e.g. with a process that never answers) and
// INTEGRATION_API_TIMEOUT_MS shortens the wait, to exercise the failure cleanup.
const apiBin = process.env.INTEGRATION_API_BIN || resolve(repoRoot, 'node_modules/.bin/linked');
const startTimeoutMs = Number(process.env.INTEGRATION_API_TIMEOUT_MS) || 60_000;

async function answers(url: string): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

/**
 * Refuses unless the target is safe to wipe: the dataset name ends in `-test`, and the Fuseki URL is on localhost at
 * the host port Docker Compose publishes for this repo's `fuseki` service (so never another project's Fuseki).
 */
function assertSafeTarget(baseUrl: string) {
  const target = `${baseUrl}/$/datasets/${FUSEKI_DATASET}`;
  const refuse = (reason: string): never => {
    throw new Error(`Refusing to reset ${target}: ${reason}`);
  };
  if (!FUSEKI_DATASET.endsWith('-test')) refuse('the dataset name does not end in "-test".');

  const url = new URL(baseUrl);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) refuse(`${url.hostname} is not localhost.`);
  const urlPort = url.port || (url.protocol === 'https:' ? '443' : '80');

  const compose = spawnSync('docker', ['compose', 'port', 'fuseki', '3030'], { cwd: repoRoot, encoding: 'utf8' });
  const composePort = compose.status === 0 ? /:(\d+)\s*$/.exec(compose.stdout.trim())?.[1] : undefined;
  if (!composePort) {
    refuse(
      `this repo's Compose Fuseki is not running (\`docker compose port fuseki 3030\`: ` +
        `${(compose.stderr || compose.error?.message || compose.stdout || '').trim()}). Run \`npm run fuseki:up\`.`,
    );
  }
  if (composePort !== urlPort) {
    refuse(`port ${urlPort} is not the Compose Fuseki port ${composePort}. Set FUSEKI_PORT=${composePort}.`);
  }
}

/** Kills the API's whole process group; safe to call repeatedly and after it exited. */
function killGroup(api: ChildProcess, signal: NodeJS.Signals = 'SIGTERM') {
  if (!api.pid) return;
  try {
    process.kill(-api.pid, signal);
  } catch {
    // Already gone.
  }
}

export default async function globalSetup() {
  const fuseki = resolveFusekiEnv();

  // 1. Refuse a foreign target before anything is deleted.
  assertSafeTarget(fuseki.baseUrl);

  // 2. Fail fast when Fuseki is down. FUSEKI_BASE_URL is passed so the script does not read services/api/.env.
  const wait = spawnSync(process.execPath, [resolve(apiDir, 'scripts/wait-for-fuseki.mjs')], {
    env: { ...process.env, FUSEKI_BASE_URL: fuseki.baseUrl },
    encoding: 'utf8',
  });
  if (wait.status !== 0) throw new Error(wait.stderr.trim() || `wait-for-fuseki exited ${wait.status}`);

  if (await answers(API_URL)) {
    throw new Error(`Port ${API_PORT} is already in use; stop the process on it before running integration tests.`);
  }

  // 3. Reset: drop the dataset; the API's ensureDatasetExists() recreates it empty on boot.
  const auth = `Basic ${Buffer.from(`${fuseki.user}:${fuseki.password}`).toString('base64')}`;
  const del = await fetch(`${fuseki.baseUrl}/$/datasets/${FUSEKI_DATASET}`, {
    method: 'DELETE',
    headers: { Authorization: auth },
  });
  if (!del.ok && del.status !== 404) {
    throw new Error(`Deleting Fuseki dataset ${FUSEKI_DATASET} failed: ${del.status} ${await del.text()}`);
  }

  // 4. Start the API. Every Fuseki variable is explicit, and the S3 ones are blanked, so nothing is taken from
  // services/api/.env (`linked start` does not override variables that are already set, even when empty).
  const env: NodeJS.ProcessEnv = { ...process.env };
  const s3Keys = [...Object.keys(process.env), ...Object.keys(readApiEnvFile()), ...S3_ENV_KEYS];
  for (const key of s3Keys) if (/^(AWS|S3)_/.test(key)) env[key] = '';
  // Except AWS_REGION: @_linked/s3 builds a client at import with `AWS_REGION ?? 'us-east-1'`, and an empty region
  // throws "Region is missing". Removed instead; the blank S3_FILES_BUCKET_NAME already rules out S3FileStore.
  delete env.AWS_REGION;
  Object.assign(env, {
    NODE_ENV: 'development',
    PORT: String(API_PORT),
    SITE_ROOT: API_URL,
    DATA_ROOT: `${API_URL}/data`,
    FUSEKI_BASE_URL: fuseki.baseUrl,
    FUSEKI_USER: fuseki.user,
    FUSEKI_PASSWORD: fuseki.password,
    FUSEKI_DATASET,
    FUSEKI_DB_TYPE: 'mem',
  });

  let output = '';
  const api = spawn(apiBin, ['start', '--api-only'], {
    cwd: apiDir,
    env,
    // `linked start` spawns its own children (Vite, the server). `detached` gives the CLI its own process group, so
    // one `kill(-pid)` stops all of them; killing only the CLI's PID would leave the server listening on the port.
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  api.stdout?.on('data', (d) => (output += d));
  api.stderr?.on('data', (d) => (output += d));
  let exited: number | null = null;
  api.on('exit', (code) => (exited = code ?? -1));

  // A detached group outlives Jest unless it is killed: on exit, Ctrl+C and SIGTERM too, not only in teardown.
  const onExit = () => killGroup(api, 'SIGKILL');
  const onSignal = (signal: NodeJS.Signals) => {
    killGroup(api);
    // Re-raise when no one else handles it, so the default (terminate) still happens.
    if (process.listenerCount(signal) === 0) process.kill(process.pid, signal);
  };
  process.once('exit', onExit);
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  const stop = () => {
    process.off('exit', onExit);
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    killGroup(api);
  };
  (globalThis as any).__LINKED_API__ = { api, stop, killGroup: (signal: NodeJS.Signals) => killGroup(api, signal) };

  const fail = (message: string): never => {
    stop();
    throw new Error(message);
  };

  // 5. Wait until it answers HTTP (page routes 404, which is fine).
  const deadline = Date.now() + startTimeoutMs;
  while (Date.now() < deadline) {
    if (exited !== null) fail(`The API exited with ${exited} before it answered:\n${output}`);
    if (await answers(API_URL)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  fail(`The API did not answer on ${API_URL} within ${startTimeoutMs / 1000} s:\n${output}`);
}
