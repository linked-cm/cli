// Vite config helper for linked apps. Replaces webpack-based dev + build.
//
// Apps use this from their own vite.config.ts:
//
//   import {createViteConfig} from '@_linked/cli/vite';
//   export default createViteConfig({port: 4040, cssMode: 'tailwind'});
//
// The helper preserves the dev-mode `generateScopedName` (readable
// `_packageName_filename_className`) so CSS module class names match
// what the previous webpack chain produced for trace/debug. Production
// uses Vite's default scoping (content-hash, equivalent uniqueness).
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import fsExtra from 'fs-extra';
import path from 'node:path';
import {generateScopedName} from './utils.js';
import type {Plugin, UserConfig} from 'vite';

export interface LinkedViteConfigOptions {
  /** Dev server port. Default 4040. */
  port?: number;
  /** Output dir for `vite build`. Default `public/bundles`. */
  outDir?: string;
  /** CSS pipeline mode. */
  cssMode?: 'tailwind' | 'css-modules-only';
  /** Entry file for the client bundle. Default `src/index.tsx`. */
  entry?: string;
  /** Extra Vite plugins. */
  plugins?: Plugin[];
  /** Extra PostCSS plugins (e.g. `postcss-media-to-container`). */
  postcssPlugins?: unknown[];
  /** Extra `define` entries (used to bridge legacy `process.env.X` refs to client). */
  define?: Record<string, string>;
}

interface WorkspaceEntry {
  name: string;
  srcDir: string;
}

/**
 * Walk the app's package.json `workspaces` field to build a lookup table
 * from npm name → absolute src/ directory. Used by the resolver plugin
 * to map bare specifiers like `@_linked/foo/bar` directly to source.
 * No glob library: workspaces only support trailing `/*` patterns.
 */
async function discoverWorkspaces(): Promise<WorkspaceEntry[]> {
  const fs = await import('node:fs/promises');
  const cwd = process.cwd();
  const out: WorkspaceEntry[] = [];
  const seen = new Set<string>();
  // Register a package root iff it ships a `src/` dir (source install). Published
  // packages have only `lib/` and are skipped — they resolve via their exports.
  const addFromRoot = async (root: string): Promise<void> => {
    const subPkgPath = path.join(root, 'package.json');
    if (!(await fsExtra.pathExists(subPkgPath))) return;
    const srcDir = path.join(root, 'src');
    if (!(await fsExtra.pathExists(srcDir))) return;
    try {
      const sub = await fsExtra.readJson(subPkgPath);
      if (sub.name && !seen.has(sub.name)) {
        seen.add(sub.name);
        out.push({name: sub.name, srcDir});
      }
    } catch {}
  };

  // 1. The app's own `workspaces` globs — the monorepo-root case (CN, or any app
  //    that is itself a workspace root). Only trailing `/*` patterns.
  const pkgPath = path.join(cwd, 'package.json');
  if (await fsExtra.pathExists(pkgPath)) {
    const pkg = await fsExtra.readJson(pkgPath);
    const patterns: string[] = Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : pkg.workspaces?.packages ?? [];
    for (const pattern of patterns) {
      const m = pattern.match(/^(.+?)\/\*$/);
      if (m) {
        const parent = path.join(cwd, m[1]);
        if (await fsExtra.pathExists(parent)) {
          for (const ent of await fs.readdir(parent, {withFileTypes: true})) {
            if (ent.isDirectory() || ent.isSymbolicLink()) {
              await addFromRoot(path.join(parent, ent.name));
            }
          }
        }
      } else {
        await addFromRoot(path.join(cwd, pattern));
      }
    }
  }

  // 2. Dependency-graph traversal from the app's package.json. Starting from the
  //    app's own `dependencies` (+ `devDependencies`), keep the deps whose
  //    resolved package.json is marked `"linkedPackage": true` — the same marker
  //    the CLI keys on (see cli-methods.ts) — and recurse into THOSE packages'
  //    `dependencies`, with a visited-set to avoid cycles/rework.
  //
  //    A dep is REGISTERED only if it ships `src/` (a symlinked workspace clone,
  //    or a `link:`/`portal:` dev install) — that's what lets a STANDALONE app
  //    (not itself a workspace root — e.g. a per-branch clone under /apps) resolve
  //    a linked package's `.tsx` sources with extension probing, instead of
  //    falling through to the package's `development → ./src/*.ts` export (which
  //    misses `.tsx` like LinkedServer). A prod/ejected app installs PUBLISHED
  //    packages (no `src/`) → not registered, resolved via each package's `lib`.
  //
  //    The marker — NOT the npm scope — drives discovery, so a user's own
  //    custom-scope published linked package (e.g. `@acme/foo` with
  //    `linkedPackage:true`) is picked up too, and linked packages present in
  //    node_modules but not depended upon are ignored.
  const nm = path.join(cwd, 'node_modules');

  // Resolve a dependency name to its installed package.json path. A symlinked
  // workspace clone resolves under the app's node_modules just like a normal
  // install. Returns null when the package isn't installed (e.g. an optional
  // or unhoisted dep) — we skip rather than throw.
  const readInstalledPkg = async (
    name: string,
  ): Promise<{root: string; json: any} | null> => {
    const root = path.join(nm, name);
    const pkgJson = path.join(root, 'package.json');
    if (!(await fsExtra.pathExists(pkgJson))) return null;
    try {
      return {root, json: await fsExtra.readJson(pkgJson)};
    } catch {
      return null;
    }
  };

  const visited = new Set<string>();
  const walk = async (deps: Record<string, string> | undefined): Promise<void> => {
    for (const name of Object.keys(deps ?? {})) {
      if (visited.has(name)) continue;
      visited.add(name);
      const resolved = await readInstalledPkg(name);
      if (!resolved) continue;
      if (resolved.json.linkedPackage !== true) continue;
      // Register if it ships source (addFromRoot gates on src/ existing).
      await addFromRoot(resolved.root);
      // Recurse into this linked package's own dependencies.
      await walk(resolved.json.dependencies);
    }
  };

  if (await fsExtra.pathExists(pkgPath)) {
    const appPkg = await fsExtra.readJson(pkgPath);
    await walk(appPkg.dependencies);
    await walk(appPkg.devDependencies);
  }

  return out;
}

/**
 * Resolve a bare specifier like `@_linked/foo/bar`, `lincd-rdfs/Foo`, or
 * `pkg/utils/Bar.js` against the workspace lookup. Tries extensions in
 * order: .ts, .tsx, then the literal id (for files that already include
 * an extension or for non-TS assets). Returns null when the specifier
 * doesn't match any workspace package or no candidate exists on disk.
 */
async function resolveWorkspaceSpecifier(
  specifier: string,
  workspaces: WorkspaceEntry[],
): Promise<string | null> {
  for (const ws of workspaces) {
    if (specifier === ws.name) {
      for (const ext of ['index.ts', 'index.tsx']) {
        const p = path.join(ws.srcDir, ext);
        if (await fsExtra.pathExists(p)) return p;
      }
      return null;
    }
    if (specifier.startsWith(ws.name + '/')) {
      const subpath = specifier.slice(ws.name.length + 1);
      // Strip .js/.jsx suffix — workspace src uses TS published-output
      // convention (./Sibling.js) but we want the TS source.
      const base = subpath.replace(/\.jsx?$/, '');
      for (const ext of ['.tsx', '.ts']) {
        const p = path.join(ws.srcDir, base + ext);
        if (await fsExtra.pathExists(p)) return p;
      }
      // Files that already include an extension Vite handles (.css, .json,
      // .svg, etc.) — return the literal path under src.
      const literal = path.join(ws.srcDir, subpath);
      if (await fsExtra.pathExists(literal)) return literal;
      return null;
    }
  }
  return null;
}

export function createViteConfig(opts: LinkedViteConfigOptions = {}): ReturnType<typeof defineConfig> {
  return defineConfig(async ({mode}) => {
    const isDev = mode === 'development';
    const workspaces = isDev ? await discoverWorkspaces() : [];
    // STANDALONE = dev mode with no source-shipping workspaces discovered
    // (an app installed from npm outside the monorepo — its `@_linked/*` /
    // `lincd-*` deps are lib-only). discoverWorkspaces() only registers
    // packages that ship `src/` on disk, so `length === 0` is the exact
    // standalone signal used elsewhere in this file. In WORKSPACE mode
    // (CN monorepo or its workspace-member clones) this is false and none
    // of the standalone-gated branches below apply.
    const isStandalone = isDev && workspaces.length === 0;

    // Standalone dedup: the app's published `@_linked/*` / `lincd-*` deps. Vite's
    // dep-optimizer bundles each SUBPATH import into its own chunk
    // (`@_linked_schema_shapes_Person.js`, `@_linked_core_utils_LinkedStorage.js`,
    // …), and each chunk that transitively pulls a framework class gets its OWN
    // copy → the class is duplicated (`Person` → `Person2`/`3`) and its shape is
    // registered multiple times. `resolve.dedupe` forces one resolution per
    // package so the framework packages are single instances.
    const linkedDeps: string[] = [];
    if (isStandalone) {
      try {
        const appPkg = await fsExtra.readJson(path.join(process.cwd(), 'package.json'));
        const allDeps = {...appPkg.dependencies, ...appPkg.devDependencies};
        for (const name of Object.keys(allDeps)) {
          if (name.startsWith('@_linked/') || name.startsWith('lincd-')) linkedDeps.push(name);
        }
      } catch {
        /* best-effort — no package.json is fine */
      }
    }
    const config: UserConfig = {
      server: {
        port: opts.port ?? 4040,
        middlewareMode: true,
      },
      build: {
        outDir: opts.outDir ?? 'public/bundles',
        manifest: true,
        // Bump chunk-size warning so it doesn't fire on every build for
        // the linked vendor bundle. Real chunking happens via
        // manualChunks below.
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          input: opts.entry ?? 'src/index.tsx',
          output: {
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
            // Split large/common deps so route chunks don't all carry
            // their own copy AND the main entry doesn't end up at 5MB+.
            // Each manualChunk becomes its own assets/<name>-<hash>.js
            // file the browser caches independently — incremental dev
            // builds + cache wins on prod deploys both improve.
            manualChunks: (id) => {
              if (!id.includes('node_modules')) {
                // Linked workspaces ship as @_linked/* / lincd-* —
                // group all linked-framework code into a single chunk.
                if (
                  id.includes('/packages/core/') ||
                  id.includes('/packages/react/') ||
                  id.includes('/packages/server-utils/') ||
                  id.includes('/packages/primitives/') ||
                  id.includes('/packages/css/') ||
                  /\/packages\/(auth|org|schema|fuseki|owl|xsd|dcat|dcmi|s3|sentry|ui)\//.test(id)
                ) {
                  return 'linked';
                }
                return undefined;
              }
              // React + React-DOM in their own chunk — every route uses them
              if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/.test(id)) {
                return 'react-vendor';
              }
              // Heavy editor deps — only loaded on pages that need them,
              // but worth isolating so they don't get pulled into main.
              if (/[\\/]node_modules[\\/]@monaco-editor[\\/]/.test(id)) {
                return 'monaco';
              }
              // Charting/visualization
              if (/[\\/]node_modules[\\/](recharts|react-flow|@xyflow|d3-)[\\/]/.test(id)) {
                return 'viz';
              }
              // Animation
              if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id)) {
                return 'motion';
              }
              // Catch-all for other node_modules in a vendor chunk
              return 'vendor';
            },
          },
        },
        sourcemap: true,
      },
      plugins: [
        // Plan-011 phase 3a — Direct workspace specifier resolver.
        //
        // The package.json `"./*": { "development": "./src/*.ts" }` wildcard
        // can't express "try .ts, fall back to .tsx" (Node's exports spec
        // resolves to a single literal path). For React-heavy packages like
        // @_linked/primitives, @_linked/server-utils, and @_linked/auth,
        // most files are .tsx — the wildcard fails before any Vite plugin
        // gets a chance to fix it up.
        //
        // This plugin intercepts BARE workspace specifiers like
        // `@_linked/foo/bar` and `pkg-name/utils/Baz.js` BEFORE Vite's
        // package.json resolver runs, mapping them straight to source with
        // proper extension fallback (.tsx → .ts → literal). It also covers
        // the `./Sibling.js` published-output convention for imports made
        // from within workspace `src/` trees.
        isDev
          ? ({
              name: 'linked:resolve-workspace-ts',
              enforce: 'pre',
              async resolveId(id, importer) {
                if (id.startsWith('\0')) return null;

                // Workspace-internal `./Sibling.js` → `.tsx` / `.ts` rewrite.
                if (
                  importer &&
                  importer.includes(`${path.sep}packages${path.sep}`) &&
                  /\.(jsx?)$/.test(id) &&
                  (id.startsWith('.') || id.startsWith('/'))
                ) {
                  const importerDir = path.dirname(importer);
                  const base = path.resolve(importerDir, id);
                  for (const ext of ['.tsx', '.ts']) {
                    const candidate = base.replace(/\.jsx?$/, ext);
                    if (await fsExtra.pathExists(candidate)) return candidate;
                  }
                }

                // Bare workspace specifier — resolve directly to src/.
                if (
                  !id.startsWith('.') &&
                  !id.startsWith('/') &&
                  workspaces.length > 0
                ) {
                  const resolved = await resolveWorkspaceSpecifier(id, workspaces);
                  if (resolved) return resolved;
                }

                // STANDALONE (no workspaces): the linked packages are installed
                // from npm as lib-only (no `src`). We DON'T intercept them here —
                // instead the standalone `resolve.conditions` / `ssr.resolve.conditions`
                // (set on the config below, dropping Vite's `development` token)
                // let Vite's normal resolver pick each package's `import → lib/esm`
                // export. Bundling those lib files through the SSR runner works
                // (they're plain ESM); marking them external instead would leave a
                // bare specifier that `vite.ssrLoadModule` can't load
                // ("Failed to load url @_linked/server/shapes/LinkedServer").

                return null;
              },
            } as Plugin)
          : null,
        react({
          babel: {
            parserOpts: {
              plugins: ['decorators-legacy', 'classProperties'],
            },
          },
        }),
        // Dev-only: log every file the watcher sees change. Without this,
        // backend edits look silent (no JS rebuild step, no Node restart —
        // see plan-010 §"Rebuild chain") and it's hard to tell whether
        // Vite picked up the change at all.
        isDev
          ? ({
              name: 'linked:reload-log',
              configureServer(server) {
                server.watcher.on('change', (file) => {
                  const rel = file.replace(process.cwd() + '/', '');
                  console.log(`[linked] reloaded ${rel}`);
                });
              },
            } as Plugin)
          : null,
        ...(opts.plugins ?? []),
      ].filter(Boolean) as Plugin[],
      css: {
        modules: {
          generateScopedName: isDev ? generateScopedName : undefined,
        },
        postcss: opts.postcssPlugins
          ? {plugins: opts.postcssPlugins as any}
          : undefined,
      },
      esbuild: {
        tsconfigRaw: {
          compilerOptions: {
            experimentalDecorators: true,
          },
        },
        jsx: 'automatic',
      },
      // STANDALONE resolve conditions.
      //
      // The published `@_linked/*` / `lincd-*` packages export
      //   "development": "./src/*.ts",  "import": "./lib/esm/*.js"
      // In dev, Vite expands its special `development|production` condition
      // token to `development`, so it resolves these to `./src/*.ts` — which
      // doesn't exist in a lib-only npm install → boot crash
      // ("Failed to load @_linked/server/shapes/LinkedServer").
      //
      // Dropping the dev/prod token from the condition list means Vite never
      // adds `development`; `import` (always appended last by Vite) wins, so
      // these packages resolve to `./lib/esm/*.js`. We start from Vite's
      // default SERVER conditions (`module`, `node`, `development|production`)
      // minus the dev/prod token. This governs BOTH the plugin pipeline
      // (`resolve.conditions`) and the SSR module runner used by
      // `ssrLoadModule('@_linked/server/shapes/LinkedServer')` in
      // commands/start.ts (`ssr.resolve.conditions`).
      //
      // WORKSPACE-GATED: only applied standalone. In monorepo dev the packages
      // ship `src`, and we WANT `development → src` for HMR — so we leave
      // conditions at Vite's defaults there (undefined = untouched), keeping
      // CN dev byte-for-byte unchanged.
      ...(isStandalone
        ? {resolve: {conditions: ['module', 'node']}}
        : {}),
      // Plan-011 phase 3a — `ssr.external` is now a minimal allowlist of
      // npm deps that genuinely can't (or shouldn't) go through Vite's
      // SSR transform. Workspace packages (`@_linked/*`, `lincd-*`) are
      // DELIBERATELY removed so Vite resolves them via each package's
      // `development → ./src/*.ts` conditional export and HMR works on
      // source changes (see plan-011 §I1).
      //
      // "Multiple LINCD" warnings may resurface during the interim until
      // LINCD eradication completes (plan-011 §I2 — accepted).
      ssr: {
        // NOTE: Vite's `ssr.external` only accepts exact package-name strings
        // (not regex). Standalone `@_linked/*` / `lincd-*` are NOT force-listed
        // here — they auto-externalize (or bundle) and resolve via the
        // standalone `import → lib/esm` conditions set below.
        external: [
          'react',
          'react-dom',
          'react-dom/server',
          'react-router-dom',
          'scheduler',
          'express',
        ],
        // Vite 7 auto-externalizes node_modules packages for SSR (loading them
        // via Node → the `import`→`lib/esm` condition), which would bypass the
        // `linked:resolve-workspace-ts` resolver and create a SECOND module
        // instance of each workspace package (breaking the single-`src`-instance
        // invariant — `LinkedStorage` state set on one instance, read on the
        // other → "No query dispatch configured"). Force the workspace packages
        // to be BUNDLED so they resolve via each package's `development → src`.
        //
        // WORKSPACE-GATED: only force-bundle when workspaces are actually
        // present (the monorepo / CN + CN's workspace-member clones, where the
        // `@_linked/*` packages have `src` on disk). A STANDALONE app (CLI-
        // created, no workspaces) installs `@_linked/*` from npm as lib-only —
        // those have NO `src`, so bundling them via the `development → src`
        // condition fails ("Failed to load @_linked/server/shapes/LinkedServer").
        // Leaving them EXTERNAL lets Node resolve `import → lib/esm`. Single-
        // instance is not a concern standalone (one node_modules copy each) and
        // core's query dispatch is global-backed regardless.
        noExternal: workspaces.length > 0 ? [/^@_linked\//, /^lincd-/] : [],
        // STANDALONE: the SSR module runner (`vite.ssrLoadModule`, used to
        // load LinkedServer + the app graph in commands/start.ts) has its OWN
        // condition list, defaulting to `resolve.conditions`. Set it
        // explicitly so `development` is excluded there too and the lib-only
        // packages resolve via `import → lib/esm`. Omitted (defaults kept) in
        // workspace mode so monorepo SSR still resolves `development → src`.
        ...(isStandalone
          ? {resolve: {conditions: ['module', 'node'], dedupe: linkedDeps}}
          : {}),
      },
      define: {
        // The FRAMEWORK's only client-side env dependency: `@_linked/server-utils`'s
        // `Server.ts` reads `process.env.SITE_ROOT` to target the backend. The
        // browser has no `process`, and Vite (unlike webpack's EnvironmentPlugin)
        // doesn't auto-inline `process.env.X`, so we define SITE_ROOT here — it's
        // always the app's own origin, defaulted to `http://localhost:<port>` (an
        // explicit `SITE_ROOT` env, e.g. from `.env-cmdrc`, still wins). NODE_ENV
        // is a common client guard, so define it too.
        //
        // We define only these SPECIFIC tokens (never a whole-object `process.env`
        // replacement): Vite's `define` also hits the SSR transform, and the backend
        // reads `process.env` at runtime (e.g. passes the whole object to
        // `parseDatasetsConfig`) — clobbering bare `process.env` would strip the
        // server's env.
        //
        // Apps expose their OWN frontend env vars by adding to `define` in their
        // `vite.config.ts`, e.g.:
        //   createViteConfig({ define: {
        //     'process.env.MY_PUBLIC_KEY': JSON.stringify(process.env.MY_PUBLIC_KEY),
        //   }})
        // (only reference PUBLIC vars in client code — a defined secret would be
        // inlined into the browser bundle).
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
        'process.env.SITE_ROOT': JSON.stringify(
          process.env.SITE_ROOT ?? `http://localhost:${process.env.PORT ?? opts.port ?? 4040}`,
        ),
        ...(opts.define ?? {}),
      },
      // In WORKSPACE mode, the discovered source-shipping packages (@_linked/*,
      // lincd-*) are resolved to their `src/` by the `linked:resolve-workspace-ts`
      // plugin. In the CN monorepo they live under `packages/*` so esbuild's dep
      // optimizer skips them; but in a workspace-member CLONE (e.g. a per-branch
      // /apps clone) they resolve via `node_modules` SYMLINKS, so esbuild tries to
      // pre-bundle them and fails resolving their subpaths through `exports`
      // ("No known conditions for ./shapes/SHACL …"). Exclude them from
      // optimizeDeps so the workspace-ts plugin owns their resolution instead.
      ...(workspaces.length > 0
        ? {optimizeDeps: {exclude: workspaces.map((w) => w.name)}}
        : {}),
    };

    // Tailwind plugin (only if explicitly enabled — adds a heavy plugin).
    if (opts.cssMode === 'tailwind') {
      // Try ESM dynamic import first (works when @tailwindcss/vite is
      // installed in the app or hoisted). Surface a CLEAR warning when
      // it's not — the app needs the dep for theme variables to load.
      try {
        const tailwind: any = await import('@tailwindcss/vite' as any);
        const tailwindPlugin = tailwind.default ?? tailwind;
        (config.plugins as Plugin[]).push(tailwindPlugin());
      } catch (err) {
        console.warn(
          '[createViteConfig] cssMode=tailwind but @tailwindcss/vite ' +
            'could not be loaded. Theme variables won\'t apply at runtime. ' +
            'Add `@tailwindcss/vite` to your app\'s package.json.',
        );
      }
    }

    return config;
  });
}
