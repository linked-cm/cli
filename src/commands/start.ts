// `linked start --vite` orchestrator.
//
// Follows the existing startServer() flow from cli-methods.ts but injects
// a Vite dev server in middleware mode + overrides loadAppComponent /
// loadRoutes to use vite.ssrLoadModule. This means LincdServer's existing
// initialization works unchanged; we just route module loading through
// Vite instead of webpack/Node-direct.
//
// What's different vs the legacy startServer():
//   - No webpack-dev-middleware (LincdServer skips when viteMiddleware set)
//   - Vite handles the client transform + HMR
//   - ssrLoadModule handles the server transform (decorators, jsx, ts)
//   - Server changes still need full process restart for now (server HMR
//     deferred to vite-node migration)
import path from 'node:path';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import fsExtra from 'fs-extra';

export interface StartOptions {
  env?: string;
  port?: number;
}

interface WorkspacePackage {
  name: string;
  root: string;
  srcDir: string;
}

/**
 * Plan-011 phase 3b — discover workspace packages from the app's
 * `package.json` `workspaces` field. No hand-maintained list anywhere;
 * adding a new linked package = appearing in the right glob.
 *
 * Returns each package's npm `name` (so we can call `onSourceChange(name)`),
 * its absolute root, and its `src/` directory for fast prefix matching.
 */
async function discoverWorkspacePackages(cwd: string): Promise<WorkspacePackage[]> {
  const pkgJsonPath = path.join(cwd, 'package.json');
  if (!(await fsExtra.pathExists(pkgJsonPath))) return [];
  const pkgJson = await fsExtra.readJson(pkgJsonPath);
  const workspaces: string[] = Array.isArray(pkgJson.workspaces)
    ? pkgJson.workspaces
    : pkgJson.workspaces?.packages ?? [];
  const out: WorkspacePackage[] = [];

  // Include the root app itself so edits to <cwd>/src/* trigger HMR for
  // the app's own providers (e.g. CN's src/backend.ts which registers ~25
  // Express routes).
  if (pkgJson.name && (await fsExtra.pathExists(path.join(cwd, 'src')))) {
    out.push({name: pkgJson.name, root: cwd, srcDir: path.join(cwd, 'src')});
  }
  for (const glob of workspaces) {
    // Workspaces only support trailing /* globs in npm/yarn/pnpm — we
    // expand by directory listing rather than a full glob library.
    const m = glob.match(/^(.+?)\/\*$/);
    const candidates: string[] = [];
    if (m) {
      const parent = path.join(cwd, m[1]);
      if (await fsExtra.pathExists(parent)) {
        const entries = await fs.readdir(parent, {withFileTypes: true});
        for (const dirent of entries) {
          if (dirent.isDirectory() || dirent.isSymbolicLink()) {
            candidates.push(path.join(parent, dirent.name));
          }
        }
      }
    } else {
      candidates.push(path.join(cwd, glob));
    }
    for (const root of candidates) {
      const pkgPath = path.join(root, 'package.json');
      if (!(await fsExtra.pathExists(pkgPath))) continue;
      try {
        const sub = await fsExtra.readJson(pkgPath);
        if (sub.name) {
          out.push({name: sub.name, root, srcDir: path.join(root, 'src')});
        }
      } catch {
        // ignore broken package.json
      }
    }
  }
  return out;
}

function workspacePackageForPath(
  filepath: string,
  pkgs: WorkspacePackage[],
): string | null {
  for (const p of pkgs) {
    if (filepath.startsWith(p.srcDir + path.sep) || filepath === p.srcDir) {
      return p.name;
    }
  }
  return null;
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open';
  spawn(cmd, [url], {detached: true, stdio: 'ignore'}).unref();
}

function installShortcuts(opts: {url: string; onRestart: () => void}): void {
  if (!process.stdin.isTTY) return;
  let buf = '';
  try {
    process.stdin.setRawMode(true);
  } catch {
    return;
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  const cleanup = () => {
    try {
      process.stdin.setRawMode(false);
    } catch {}
  };
  process.on('exit', cleanup);
  process.stdin.on('data', (chunk: string) => {
    for (const ch of chunk) {
      // Ctrl-C → graceful exit, restore terminal first.
      if (ch === '') {
        cleanup();
        process.exit(0);
      }
      if (ch === '\r' || ch === '\n') {
        const cmd = buf.trim();
        buf = '';
        if (cmd === 'r') {
          console.log('[linked] restarting…');
          opts.onRestart();
        } else if (cmd === 'o') {
          console.log(`[linked] opening ${opts.url}`);
          openBrowser(opts.url);
        }
      } else {
        buf += ch;
      }
    }
  });
  console.log(
    `[linked] press r<enter> to restart · o<enter> to open ${opts.url}`,
  );
}

function restartProcess(): void {
  // nodemon-style respawn: launch a fresh process from the same argv,
  // then exit. The new process inherits stdio so the dev experience is
  // continuous.
  const [node, ...argv] = process.argv;
  const child = spawn(node, argv, {
    stdio: 'inherit',
    detached: true,
    env: process.env,
  });
  child.unref();
  process.exit(0);
}

export async function startWithVite(opts: StartOptions = {}): Promise<void> {
  const cwd = process.cwd();

  // Ensure env-cmd vars are loaded just like startServer() does.
  // We piggyback on the same helper for consistency.
  const {ensureEnvironmentLoaded} = await import('../cli-methods.js');
  await ensureEnvironmentLoaded();

  // Apps must have a vite.config.{ts,js} at CWD that exports the result of
  // `createViteConfig({...})`. We don't load it ourselves — Vite picks it
  // up automatically from `cwd`.
  const viteConfigCandidates = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];
  const viteConfigFound = viteConfigCandidates.find((c) =>
    fsExtra.existsSync(path.join(cwd, c)),
  );
  if (!viteConfigFound) {
    throw new Error(
      `[linked start --vite] no vite.config.{ts,js,mjs} found in ${cwd}. Add one:\n\n  import {createViteConfig} from '@_linked/cli/vite-config';\n  export default createViteConfig({port: 4040, cssMode: 'tailwind'});\n`,
    );
  }

  const {createServer: createViteServer} = await import('vite');

  // Load user's linked.config.js (legacy hook). It still drives things
  // like server.cachePaths and the rest of LincdServer's options.
  const linkedConfigPath = path.join(cwd, 'linked.config.js');
  let linkedConfig: any = {};
  if (fsExtra.existsSync(linkedConfigPath)) {
    linkedConfig = (await import(linkedConfigPath)).default ?? {};
  }
  linkedConfig.server = linkedConfig.server || {};

  const vite = await createViteServer({
    root: cwd,
    server: {middlewareMode: true},
    appType: 'custom',
  });

  // Inject Vite into LincdServer's config:
  //   - vite: handle for ssrLoadModule (used to load app's backend.ts via self-reference)
  //   - viteMiddleware: mounted instead of webpack-dev-middleware
  //   - loadAppComponent: route through vite.ssrLoadModule for SSR transform
  //   - loadRoutes: same
  linkedConfig.server.vite = vite;
  linkedConfig.server.viteMiddleware = vite.middlewares;
  linkedConfig.server.loadAppComponent = async () => {
    const mod = await vite.ssrLoadModule('/src/App.tsx');
    return mod.default;
  };
  linkedConfig.server.loadRoutes = async () => {
    return await vite.ssrLoadModule('/src/routes.tsx');
  };

  // Vite SSR CSS collection support (plan-010 iter1 gap A):
  // List all `src/pages/*.{ts,tsx}` files so LincdServer can ssrLoadModule
  // each into Vite's moduleGraph BEFORE the first render of a session.
  // React.lazy() doesn't auto-fire — without this, only App's eager
  // imports' CSS is collected; lazy pages' CSS arrives after hydration
  // causing an unstyled flash. After the first preload sweep, all
  // subsequent renders have full CSS available.
  linkedConfig.server.viteSsrPreload = async () => {
    const pagesDir = path.join(cwd, 'src', 'pages');
    if (!fsExtra.existsSync(pagesDir)) return [];
    const files = fsExtra.readdirSync(pagesDir, {withFileTypes: true});
    const paths: string[] = [];
    for (const file of files) {
      if (file.isFile() && /\.(tsx|ts)$/.test(file.name)) {
        paths.push(`/src/pages/${file.name}`);
      }
    }
    return paths;
  };

  // Storage config bootstrap: legacy startServer() calls this so that
  // linked.backend.storage.ts wires up its FusekiStore aliases.
  const {loadBackendStorageConfig} = await import('../cli-methods.js');
  await loadBackendStorageConfig();

  // Import LincdServer dynamically — must come after env + storage setup.
  const ServerClass = (await import('@_linked/server/shapes/LincdServer'))
    .LincdServer;

  const server = new (ServerClass as any)(linkedConfig);

  // Surface stack traces from Vite ssrLoadModule failures cleanly.
  process.on('unhandledRejection', (err: any) => {
    if (err && err.stack) {
      try {
        vite.ssrFixStacktrace(err);
      } catch {
        // ignore
      }
    }
    console.error(err);
  });

  await server.start();

  // Plan-011 phase 3b — watcher → onSourceChange wiring.
  //
  // Discover workspace packages once at boot. On each change, look up
  // which workspace package the file belongs to and call onSourceChange
  // with that package's npm name. LincdServer disposes the old providers,
  // re-imports via vite.ssrLoadModule (transparent because Vite invalidated
  // the module already), and re-instantiates. No process restart.
  const workspacePackages = await discoverWorkspacePackages(cwd);
  if (workspacePackages.length > 0) {
    console.log(
      `[linked] watching ${workspacePackages.length} workspace packages for HMR`,
    );
  }
  vite.watcher.on('change', (filepath: string) => {
    if (!/\.(tsx?|jsx?)$/.test(filepath)) return;
    const pkg = workspacePackageForPath(filepath, workspacePackages);
    if (!pkg) return;
    if (typeof (server as any).onSourceChange !== 'function') return;
    void (server as any)
      .onSourceChange(pkg)
      .catch((err: any) => {
        console.warn(
          `[linked] reload of ${pkg} failed: ${err?.message ?? err}`,
        );
      });
  });

  // Plan-011 phase 3c — r/o keyboard shortcuts.
  const port = (linkedConfig.server as any).port ?? opts.port ?? 4040;
  installShortcuts({
    url: `http://localhost:${port}/`,
    onRestart: restartProcess,
  });
}
