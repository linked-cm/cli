// `linked start` Vite-based dev/SSR orchestrator.
//
// Boots Express + Vite middleware + ssrLoadModule for the user app's
// backend. Handles all the work `webpack-dev-middleware` + the custom
// Node ESM loader did in the previous architecture, but cleanly:
//
//   - Vite owns client transform + HMR
//   - Express owns HTTP serving (LincdServer takes over once backend
//     loads)
//   - ssrLoadModule handles backend TS transform (decorators, jsx, ts)
//   - chokidar restarts the orchestrator on backend file changes
//     (no in-process module reload — deferred to vite-node migration)
//
// Designed to be drop-in for the user's `package.json` script:
//     "start": "linked start --env development"
import path from 'node:path';
import fsExtra from 'fs-extra';

export interface StartOptions {
  /** Environments to load (passed through env-cmd downstream). */
  env?: string;
  /** Override port. Default reads from vite.config or 4040. */
  port?: number;
}

/**
 * Boot a linked app via Vite + Express + LincdServer.
 *
 * Phase 5 will wire this to the user's CN app. For Phase 2, this lives
 * but is not yet invoked from `linked start` (the old startServer keeps
 * working until Phase 5 swaps the wire-up).
 */
export async function startWithVite(opts: StartOptions = {}): Promise<void> {
  const cwd = process.cwd();

  // Express + Vite middleware setup. Both are runtime deps of `@_linked/cli`
  // (added in Phase 2). The dynamic imports keep them lazy — `linked` commands
  // that don't need them (create-app, build-package, etc.) don't pay for the
  // import.
  const express = (await import('express')).default;
  const {createServer: createViteServer} = await import('vite');

  // Apps must have a vite.config.{ts,js} at CWD that exports the result of
  // `createViteConfig({...})`. We don't load it ourselves — Vite picks it
  // up automatically from `cwd`.
  const viteConfigCandidates = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];
  const viteConfigFound = viteConfigCandidates.find((c) =>
    fsExtra.existsSync(path.join(cwd, c)),
  );
  if (!viteConfigFound) {
    throw new Error(
      `[linked start] no vite.config.{ts,js,mjs} found in ${cwd}. Add one:\n\n  import {createViteConfig} from '@_linked/cli/vite';\n  export default createViteConfig({port: 4040, cssMode: 'tailwind'});\n`,
    );
  }

  const app = express();

  const vite = await createViteServer({
    root: cwd,
    server: {middlewareMode: true},
    appType: 'custom',
  });

  // Vite's middleware handles /@vite/client, HMR, dep prebundling, and any
  // requests Vite resolves (TS/JSX transform, CSS modules, asset URLs).
  app.use(vite.middlewares);

  // Load the user's backend via Vite's SSR module loader. This gives the
  // backend code (decorators, jsx, ts, conditional exports) the same
  // transform Vite applies to client modules — the load-bearing fix for
  // the original loader pain.
  let backendModule: any;
  try {
    backendModule = await vite.ssrLoadModule(`/src/backend.ts`);
  } catch (err) {
    vite.ssrFixStacktrace(err as Error);
    console.error('[linked start] backend.ts load failed:');
    console.error(err);
    throw err;
  }

  // Conventional: backend.ts exports default a BackendProvider class.
  // LincdServer is wired up via that provider's constructor. We hand the
  // Express app + vite handle in so the provider can attach routes and
  // serve SSR via vite.ssrLoadModule for the rest of the app graph.
  const BackendProviderClass = backendModule?.default ?? backendModule;
  if (typeof BackendProviderClass !== 'function') {
    throw new Error(
      `[linked start] backend.ts must export a default backend provider class`,
    );
  }

  // The backend provider will own LincdServer instantiation + start().
  // We pass app + vite so it can use Vite for SSR module loading.
  const provider = new BackendProviderClass({app, vite, cwd});
  if (typeof provider.start === 'function') {
    await provider.start();
  }

  // chokidar watcher for backend changes -> orchestrator restart.
  // Server-HMR via in-process re-import is deferred to vite-node migration.
  // For now: SIGTERM + spawn-new is the supervisor's job.
  const chokidar = (await import('chokidar')).default;
  const watcher = chokidar.watch(`${cwd}/src/**/*.{ts,tsx}`, {
    ignored: /node_modules|lib\//,
    ignoreInitial: true,
  });
  let restartTimer: NodeJS.Timeout | null = null;
  watcher.on('change', (filePath: string) => {
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      console.log(`[linked start] backend change detected (${filePath}); restart required`);
      // Supervisor mode: emit signal for parent process to respawn us.
      // Standalone mode: graceful re-import is not implemented (see comment above).
      process.emit('SIGUSR2' as any);
    }, 100);
  });

  console.log(`[linked start] ready at http://localhost:${opts.port ?? 4040}`);
}
