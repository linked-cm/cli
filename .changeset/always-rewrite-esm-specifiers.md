---
'@_linked/cli': minor
---

Always rewrite emitted ESM import specifiers; remove `linked.extensionlessImports`

`linked build` now appends `.js` (or `/index.js`) to relative specifiers in `lib/esm` for every package, with no
opt-in. The rewrite covers the emitted `.d.ts` declarations as well as the `.js`, so consumers on TypeScript
`node16`/`nodenext` resolution get valid declarations. For a package that already writes `.js` specifiers the
rewrite is a no-op.

Breaking-ish:

- The `"linked": {"extensionlessImports": true}` field in `package.json` is removed. It is now ignored; delete it.
  Packages that set it keep working — the behaviour it enabled is the default.
- The `missing_extension` rule is gone from the import check, in the build gate and in `linked check-imports`.
  Extensionless relative imports in source no longer fail the build; the rewrite warns about any relative
  specifier it cannot resolve, and Vite, Metro and `tsc` catch the rest. `outside_package` and `lincd` remain
  hard errors for every package.

A package without a `tsconfig-esm.json` has no ESM build, so the rewrite step is skipped rather than failing. When
`tsconfig-esm.json` is present but `lib/esm` was not emitted, the build fails.
