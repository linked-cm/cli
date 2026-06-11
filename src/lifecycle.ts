// Lifecycle helpers shared by the Vite-based dev orchestrator.
//
// Extracted from cli-methods.ts so the SSR module graph (started from
// `commands/start.ts`) doesn't have to walk the rest of that file. The
// legacy webpack-era helpers in cli-methods.ts contain many dynamic
// `import(<variable>)` calls Vite can't analyze statically and would
// emit warnings about — even though startWithVite never calls them.

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import {getPackageJSON} from './utils.js';
import type {PackageDetails} from './interfaces.js';

/**
 * Read the app's `.env-cmdrc.json`, apply the requested `--env` profile
 * to `process.env`, snapshot the original shell env so it still wins on
 * conflict. Idempotent — runs at most once per process.
 */
export const ensureEnvironmentLoaded = async (): Promise<void> => {
  if (process.env.ENV_VARS_LOADED) return;
  // env-cmd ships ESM; literal specifier is fine for Vite's analyzer.
  const {GetEnvVars} = await import('env-cmd');
  const envCmdrcPath = path.join(process.cwd(), '.env-cmdrc.json');
  if (!fs.existsSync(envCmdrcPath)) {
    console.warn(
      'No .env-cmdrc.json found in this folder. Are you running this command from the root of a Linked app?',
    );
    process.exit();
  }
  const vars = await GetEnvVars({envFile: {filePath: envCmdrcPath}});
  const environments = Object.keys(vars);

  // Snapshot the original shell env — it should always take priority.
  const shellEnv = {...process.env};

  if (environments.includes('_main')) {
    process.env = {...process.env, ...vars._main};
  }
  const args = process.argv.splice(2);
  if (args.includes('--env')) {
    const envIndex = args.indexOf('--env');
    const envArg = args[envIndex + 1];
    envArg.split(',').forEach((name) => {
      if (environments.includes(name)) {
        console.log('Environment: ' + name);
        process.env = {...process.env, ...vars[name]};
      } else {
        console.warn(
          `Environment ${name} not found in .env-cmdrc.json. Available: ${environments.join(', ')}`,
        );
      }
    });
  } else {
    process.env = {...process.env, ...vars.development};
    console.log('No environment specified, using development');
  }
  // Re-apply shell env so it always wins over .env-cmdrc.json.
  process.env = {...process.env, ...shellEnv};
  process.env.ENV_VARS_LOADED = 'true';
};

/**
 * Discover and load the app's storage-config bootstrap file. Tries the
 * canonical `linked.backend.storage.{ts,js}` first, then legacy paths.
 * Returns whatever the file's default export evaluates to, or undefined
 * if no candidate exists.
 */
export async function loadBackendStorageConfig(): Promise<any> {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'linked.backend.storage.ts'),
    path.join(cwd, 'linked.backend.storage.js'),
    path.join(cwd, 'backend-storage-config.ts'),
    path.join(cwd, 'backend-storage-config.js'),
    path.join(cwd, 'scripts', 'backend-storage-config.js'),
    path.join(cwd, 'scripts', 'backend-storage-config.ts'),
    path.join(cwd, 'scripts', 'storage-config.js'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      // Variable specifier is intentional — we discover the path at
      // runtime by probing the candidate list, so static analysis is
      // impossible.
      return import(/* @vite-ignore */ candidate);
    }
  }
  console.warn(
    chalk.yellow(
      '[linked.backend.storage] no linked.backend.storage.{ts,js} found at app root.',
    ),
  );
  return undefined;
}

/**
 * Walk the app's `package.json` `workspaces` field and return every
 * workspace package that declares `"linkedPackage": true`.
 *
 * Lives here (not in cli-methods.ts) so consumers like LincdServer can
 * import it without dragging the rest of the legacy webpack flow into
 * Vite's SSR module graph.
 */
export function getLincdPackages(
  rootPath = process.cwd(),
): PackageDetails[] {
  let pack = getPackageJSON(rootPath);
  if (!pack || !pack.workspaces) {
    const originalRoot = rootPath;
    for (let i = 0; i <= 3; i++) {
      rootPath = path.join(originalRoot, ...Array(i).fill('..'));
      pack = getPackageJSON(rootPath);
      if (pack && pack.workspaces) break;
    }
  }
  if (!pack || !pack.workspaces) {
    // Standalone apps (scaffolded with `linked create-app`) don't have
    // workspaces — expected; just no local packages to scan.
    return [];
  }
  const res: PackageDetails[] = [];
  checkWorkspaces(rootPath, pack.workspaces, res);
  return res;
}

function checkWorkspaces(rootPath: string, workspaces: any, res: PackageDetails[]) {
  if (workspaces.packages) {
    workspaces = workspaces.packages;
  }
  workspaces.forEach((workspace: string) => {
    const workspacePath = path.join(rootPath, workspace.replace('/*', ''));
    if (workspace.indexOf('/*') !== -1) {
      if (fs.existsSync(workspacePath)) {
        const folders = fs.readdirSync(workspacePath);
        folders.forEach((folder: string) => {
          if (folder !== './' && folder !== '../') {
            checkPackagePath(rootPath, path.join(workspacePath, folder), res);
          }
        });
      }
    } else {
      checkPackagePath(rootPath, workspacePath, res);
    }
  });
}

function checkPackagePath(rootPath: string, packagePath: string, res: PackageDetails[]) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return;
  const pack = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (pack && pack.workspaces) {
    checkWorkspaces(packagePath, pack.workspaces, res);
  } else if (pack && pack.linkedPackage === true) {
    res.push({path: packagePath, packageName: pack.name});
  }
}
