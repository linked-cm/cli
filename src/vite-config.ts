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
        rollupOptions: {
          input: opts.entry ?? 'src/index.tsx',
          output: {
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
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
      ssr: {
        // Linked workspace packages need Vite transforms applied for SSR
        // so decorators + CSS imports + conditional `exports` work.
        noExternal: [/^@_linked\//],
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
