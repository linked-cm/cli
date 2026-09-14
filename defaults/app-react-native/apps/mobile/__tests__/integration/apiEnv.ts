/// <reference types="node" />
// Shared by globalSetup, globalTeardown and the tests: where the test API and Fuseki live.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const API_PORT = 4100;
export const API_URL = `http://localhost:${API_PORT}`;
// globalSetup deletes this dataset, so it must end in `-test` (checked there).
export const FUSEKI_DATASET = 'app-test';

export const repoRoot = resolve(__dirname, '../../../..');
export const apiDir = resolve(repoRoot, 'services/api');

/** Minimal KEY=VALUE parser for services/api/.env: no expansion, no multi-line values. */
export function parseEnvFile(text: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    vars[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return vars;
}

/** services/api/.env as key/value pairs; empty when the file does not exist. */
export function readApiEnvFile(): Record<string, string> {
  const envFile = resolve(apiDir, '.env');
  return existsSync(envFile) ? parseEnvFile(readFileSync(envFile, 'utf8')) : {};
}

export type FusekiEnv = { baseUrl: string; user: string; password: string };

/**
 * The Fuseki the tests talk to. services/api/.env is the source, and the shell wins: FUSEKI_BASE_URL, or
 * FUSEKI_PORT (the Compose host port) as a shorthand for localhost.
 */
export function resolveFusekiEnv(env: NodeJS.ProcessEnv = process.env): FusekiEnv {
  const file = readApiEnvFile();
  const baseUrl =
    env.FUSEKI_BASE_URL ||
    (env.FUSEKI_PORT ? `http://localhost:${env.FUSEKI_PORT}` : '') ||
    file.FUSEKI_BASE_URL ||
    'http://localhost:3030';
  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    user: env.FUSEKI_USER || file.FUSEKI_USER || 'admin',
    password: env.FUSEKI_PASSWORD || file.FUSEKI_PASSWORD || 'admin',
  };
}
