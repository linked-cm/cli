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

export function createViteConfig(opts: LinkedViteConfigOptions = {}): ReturnType<typeof defineConfig> {
  return defineConfig(async ({mode}) => {
    const isDev = mode === 'development';
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
        // Plan-011 phase 3a — Workspace `.js` → `.ts` resolver.
        //
        // Workspace package source uses `import {X} from './Sibling.js'`
        // (TS published-output convention). With the wildcard
        // `"./*": { "development": "./src/*.ts" }` exports, Vite would
        // otherwise hit `./src/Sibling.js.ts` and fail. This plugin
        // intercepts resolution scoped to workspace `src/` trees and
        // rewrites trailing `.js` → `.ts` (and `.jsx` → `.tsx`) when the
        // `.ts` (or `.tsx`) actually exists on disk.
        //
        // Scoped to workspace packages only (importer path includes
        // `/packages/`) so we don't accidentally rewrite npm-dep imports.
        isDev
          ? ({
              name: 'linked:resolve-workspace-ts',
              enforce: 'pre',
              async resolveId(id, importer) {
                if (!importer) return null;
                if (!importer.includes(`${path.sep}packages${path.sep}`)) return null;
                if (!/\.(jsx?)$/.test(id) || id.startsWith('\0')) return null;
                if (!id.startsWith('.') && !id.startsWith('/')) return null;
                const importerDir = path.dirname(importer);
                const base = path.resolve(importerDir, id);
                const tsCandidate = base.replace(/\.jsx?$/, (m) =>
                  m === '.jsx' ? '.tsx' : '.ts',
                );
                if (await fsExtra.pathExists(tsCandidate)) return tsCandidate;
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
