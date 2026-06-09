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
  return defineConfig(({mode}) => {
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
        react({
          babel: {
            parserOpts: {
              plugins: ['decorators-legacy', 'classProperties'],
            },
          },
        }),
        ...(opts.plugins ?? []),
      ],
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
      // SSR externals: @_linked/* (and friends) MUST load via Node's
      // resolver to share a single instance with LincdServer and the
      // app's backend.ts. Vite's default would auto-bundle workspace-
      // symlinked packages (since they live in /packages and look like
      // local source), creating a SECOND copy that the LINCD initTree
      // check trips on ("Multiple versions of LINCD are loaded").
      // Explicit `external` overrides this for known package scopes.
      // HMR on workspace source is a separate concern, addressed via
      // conditional exports (plan-010 deferred phase 3).
      ssr: {
        external: [
          // Match every @_linked/* and legacy lincd-* package by their
          // node_modules path roots — Vite externalizes them so Node
          // loads them from disk once.
          '@_linked/core',
          '@_linked/auth',
          '@_linked/css',
          '@_linked/dcat',
          '@_linked/dcmi',
          '@_linked/fuseki',
          '@_linked/org',
          '@_linked/owl',
          '@_linked/primitives',
          '@_linked/react',
          '@_linked/s3',
          '@_linked/schema',
          '@_linked/sentry',
          '@_linked/server',
          '@_linked/server-utils',
          '@_linked/ui',
          '@_linked/xsd',
          'lincd',
          'lincd-rdfs',
          'lincd-sioc',
          'lincd-design-elems',
          'foaf',
        ],
      },
      define: opts.define ?? {},
    };

    // Tailwind plugin (only if explicitly enabled — adds a heavy plugin).
    if (opts.cssMode === 'tailwind') {
      // Optional dependency. If not installed, fall through silently — the
      // app can install `@tailwindcss/vite` itself.
      try {
        // Use top-level require so the import is conditional. Vite config runs
        // in Node so require() is available (commonjs interop).
        const tailwind = require('@tailwindcss/vite');
        const tailwindPlugin = tailwind.default ?? tailwind;
        (config.plugins as Plugin[]).push(tailwindPlugin());
      } catch {
        // ignore — caller may have CSS modules only
      }
    }

    return config;
  });
}
