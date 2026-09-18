---
'@_linked/cli': minor
---

Always rewrite emitted ESM import specifiers

`linked build` appends `.js` (or `/index.js`) to relative specifiers in `lib/esm` for every package, with no
opt-in. The rewrite covers the emitted `.d.ts` declarations as well as the `.js`, so consumers on TypeScript
`node16`/`nodenext` resolution get valid declarations. For a package that already writes `.js` specifiers the
rewrite is a no-op.

It runs at the end of the build, after the assets and hand-written declarations have been copied into `lib` and
after stale output has been removed, so every specifier is resolved against the files the package actually ships.
Asset imports such as `./styles.scss` resolve and are left as written, copied `.d.ts` files are rewritten too, and
a leftover `x.js` can no longer make `./x` point at a file the cleanup then deletes.

Also in this release:

- The `missing_extension` rule is gone from the import check, in the build gate and in `linked check-imports`.
  Extensionless relative imports in source no longer fail the build; the rewrite warns about any relative
  specifier it cannot resolve, and Vite, Metro and `tsc` catch the rest. `outside_package` and the
  internal-import rule remain hard errors for every package.
- The rule that stops a package reaching into another Linked package's internals now actually fires. It matched
  only import paths containing the literal string `lincd`, so after the rename to the `@_linked/*` scope it was a
  no-op for every current package: `@_linked/core/lib/esm/utils/Shape` passed. It now matches `@_linked/<pkg>/...`
  as well as `lincd`-prefixed package names, on a `/src/` or `/lib/` path segment, and is called
  `isInternalLinkedImport`. This can fail builds that previously passed — which is the point: such an import
  breaks when the other package changes its build layout and bypasses its exports map. Import the public subpath
  instead. Relative specifiers are exempt, so a local `./lib/helpers` is still fine.
- Both import rules now see every form that names a module — `export ... from`, `import()` in value and type
  position, and `import x = require()` — not just `import ... from`.
- `linked check-imports` prints the report and exits 1 when an import is invalid, instead of exiting 0.
- `linked build` reports failures accurately: a step that fails names itself instead of a bare "Build failed",
  and a failed build always exits non-zero, including under `--silent` and when building updated packages.
- `isImportOutsideOfPackage` normalises the path before judging it, so `./a..b` is no longer flagged and
  `../a/../b` is counted as the one level it actually climbs.
- A relative specifier with a trailing slash (`./file/`) names a directory, so it resolves to `./file/index.js`
  and never to a sibling `./file.js`.

A package without a `tsconfig-esm.json` has no ESM build, so the rewrite step is skipped rather than failing. When
`tsconfig-esm.json` is present but `lib/esm` was not emitted, the build fails.
