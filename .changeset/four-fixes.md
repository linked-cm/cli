---
"@_linked/cli": minor
---

Four scaffolding/runtime fixes from first external-user feedback:

- **Template `src/package.ts` now imports from `@_linked/react/package`** instead of `@_linked/core/utils/Package`. Core's `LinkedPackageObject` doesn't expose `linkedComponent` / `linkedSetComponent` (they're React-only) — the old import caused `tsc` to error on a fresh scaffold the moment a user added their first shape. Requires `@_linked/react@>=1.3.1` (which fixed the recursion in `linkedPackage`).

- **`linked` CLI swapped `tsx` for a custom esbuild-based ESM loader** for TS/TSX user code. tsx hardcodes esbuild's default decorator emit (TC39 standard) and ignores `experimentalDecorators` in the user's tsconfig — silently breaking `@literalProperty` / `@objectProperty` / `@linkedShape` everywhere, since `@_linked/core` ships legacy-signature `(target, propertyKey, descriptor)` decorators. The new loader at `lib/esm/loaders/ts-loader.mjs` reads the user's `tsconfig.json`, force-enables `experimentalDecorators: true` in the esbuild `tsconfigRaw`, preserves import-attribute (`with { type: 'json' }`) syntax, and backfills extension-less relative imports. Net effect: legacy decorator emit just works, no esbuild-bundle workaround needed for scripts.

- **`create-app` now writes an empty `yarn.lock` in the new app**. Without it, Yarn climbs ancestor dirs looking for a project root and may decide an ancestor's stray `yarn.lock` is "the project" — aborting install with "the nearest package directory doesn't seem to be part of the project declared in <ancestor>".

- **Template `linked.backend.storage.ts` and `src/linked.frontend.storage.ts` use `with { type: 'json' }`** for the JSON dataset config imports, replacing the deprecated `assert { type: 'json' }` syntax (which Node 22+ rejects).
