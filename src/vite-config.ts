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
  const pkgPath = path.join(cwd, 'package.json');
  if (!(await fsExtra.pathExists(pkgPath))) return [];
  const pkg = await fsExtra.readJson(pkgPath);
  const patterns: string[] = Array.isArray(pkg.workspaces)
    ? pkg.workspaces
    : pkg.workspaces?.packages ?? [];
  const out: WorkspaceEntry[] = [];
  for (const pattern of patterns) {
    const m = pattern.match(/^(.+?)\/\*$/);
    const candidates: string[] = [];
    if (m) {
      const parent = path.join(cwd, m[1]);
      if (await fsExtra.pathExists(parent)) {
        for (const ent of await fs.readdir(parent, {withFileTypes: true})) {
          if (ent.isDirectory() || ent.isSymbolicLink()) {
            candidates.push(path.join(parent, ent.name));
          }
        }
      }
    } else {
      candidates.push(path.join(cwd, pattern));
    }
    for (const root of candidates) {
      const subPkgPath = path.join(root, 'package.json');
      if (!(await fsExtra.pathExists(subPkgPath))) continue;
      try {
        const sub = await fsExtra.readJson(subPkgPath);
        if (sub.name) {
          out.push({name: sub.name, srcDir: path.join(root, 'src')});
        }
      } catch {}
    }
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
        external: [
          'react',
          'react-dom',
          'react-dom/server',
          'react-router-dom',
          'scheduler',
          'express',
        ],
      },
      define: opts.define ?? {},
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
