---
'@_linked/cli': patch
---

Make the `check-imports` webpack-loader plugin safe to evaluate under native Node ESM. The CJS dependencies (`loader-utils`, the consuming app's `tsconfig.json`) are now loaded lazily inside `handler()` instead of at module top level, so consumers that `import('@_linked/cli')` from an ESM context (such as a backend that dynamically imports installed packages while indexing them) no longer crash with `ReferenceError: require is not defined in ES module scope`. Webpack continues to receive the loader as `module.exports` (guarded so it is a no-op in ESM evaluation).
