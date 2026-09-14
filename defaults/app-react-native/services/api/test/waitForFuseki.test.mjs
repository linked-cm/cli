import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = resolve(dirname(fileURLToPath(import.meta.url)), '../scripts/wait-for-fuseki.mjs');

/** A port nothing listens on: bind an ephemeral port, then release it. */
async function closedPort() {
  const server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  await new Promise((r) => server.close(r));
  return port;
}

test('exits 1 with the fuseki:up hint when Fuseki is not reachable', async () => {
  const baseUrl = `http://127.0.0.1:${await closedPort()}`;
  const result = spawnSync(process.execPath, [script], {
    env: { ...process.env, FUSEKI_BASE_URL: baseUrl, WAIT_FOR_FUSEKI_TIMEOUT_MS: '300' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, new RegExp(`Fuseki is not reachable at ${baseUrl}\\. Run \`npm run fuseki:up\`\\.`));
});
