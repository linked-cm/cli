// Fails fast when Fuseki is down, instead of letting the API or the integration tests time out.
// Reads FUSEKI_BASE_URL from the environment, then from services/api/.env, then defaults to localhost:3030.
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const envFile = resolve(dirname(fileURLToPath(import.meta.url)), '../.env');
if (!process.env.FUSEKI_BASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);

const baseUrl = (process.env.FUSEKI_BASE_URL || 'http://localhost:3030').replace(/\/$/, '');
const pingUrl = `${baseUrl}/$/ping`;
const deadline = Date.now() + 5000;

while (Date.now() < deadline) {
  try {
    const res = await fetch(pingUrl, { signal: AbortSignal.timeout(1000) });
    if (res.ok) process.exit(0);
  } catch {
    // Not up yet; retry until the deadline.
  }
  await new Promise((r) => setTimeout(r, 250));
}

console.error(`Fuseki is not reachable at ${baseUrl}. Run \`npm run fuseki:up\`.`);
process.exit(1);
