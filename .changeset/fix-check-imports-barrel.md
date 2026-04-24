---
'@_linked/cli': patch
---

Remove webpack loader `./plugins/check-imports` from the package barrel (`src/index.ts`). The loader is CJS (uses `require()`) and was crashing ESM consumers at import time with "require is not defined in ES module scope". Webpack loads this file directly by path via `config-webpack.ts`, so no public export is needed. Also fix two relative imports in `tailwind.config.ts` and `utils.ts` that were missing `.js` extensions.
