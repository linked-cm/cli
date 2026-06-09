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
import fsExtra from 'fs-extra';

export interface StartOptions {
  env?: string;
  port?: number;
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
}
