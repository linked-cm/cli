/// <reference types="node" />
// Before the integration tests: check Fuseki, reset the in-memory test dataset, start the API-only backend.
import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { API_PORT, API_URL, FUSEKI_BASE_URL, FUSEKI_DATASET } from './apiEnv';

const repoRoot = resolve(__dirname, '../../../..');
const apiDir = resolve(repoRoot, 'services/api');
const fusekiUser = process.env.FUSEKI_USER || 'admin';
const fusekiPassword = process.env.FUSEKI_PASSWORD || 'admin';

async function answers(url: string): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

export default async function globalSetup() {
  // 1. Fail fast when Fuseki is down. FUSEKI_BASE_URL is passed explicitly so services/api/.env is not used.
  const wait = spawnSync(process.execPath, [resolve(apiDir, 'scripts/wait-for-fuseki.mjs')], {
    env: { ...process.env, FUSEKI_BASE_URL },
    encoding: 'utf8',
  });
  if (wait.status !== 0) throw new Error(wait.stderr.trim() || `wait-for-fuseki exited ${wait.status}`);

  // 2. Reset: drop the dataset; the API's ensureDatasetExists() recreates it empty on boot.
  const auth = `Basic ${Buffer.from(`${fusekiUser}:${fusekiPassword}`).toString('base64')}`;
  const del = await fetch(`${FUSEKI_BASE_URL}/$/datasets/${FUSEKI_DATASET}`, {
    method: 'DELETE',
    headers: { Authorization: auth },
  });
  if (!del.ok && del.status !== 404) {
    throw new Error(`Deleting Fuseki dataset ${FUSEKI_DATASET} failed: ${del.status} ${await del.text()}`);
  }

  if (await answers(API_URL)) {
    throw new Error(`Port ${API_PORT} is already in use; stop the process on it before running integration tests.`);
  }

  // 3. Start the API. Shell env wins over services/api/.env in `linked start`.
  let output = '';
  const api = spawn(resolve(repoRoot, 'node_modules/.bin/linked'), ['start', '--api-only'], {
    cwd: apiDir,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(API_PORT),
      SITE_ROOT: API_URL,
      DATA_ROOT: `${API_URL}/data`,
      FUSEKI_BASE_URL,
      FUSEKI_DATASET,
      FUSEKI_DB_TYPE: 'mem',
    },
    // Own process group, so teardown can stop the CLI and anything it spawns.
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  api.stdout?.on('data', (d) => (output += d));
  api.stderr?.on('data', (d) => (output += d));
  let exited: number | null = null;
  api.on('exit', (code) => (exited = code ?? -1));
  (globalThis as any).__LINKED_API__ = api;

  // 4. Wait until it answers HTTP (page routes 404, which is fine).
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (exited !== null) throw new Error(`The API exited with ${exited} before it answered:\n${output}`);
    if (await answers(API_URL)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`The API did not answer on ${API_URL} within 60 s:\n${output}`);
}
