# Changelog

## 1.4.3

### Patch Changes

- [#28](https://github.com/linked-cm/cli/pull/28) [`1d2338c`](https://github.com/linked-cm/cli/commit/1d2338c09a38e44caec2aa69a72b3feda7d098bf) Thanks [@flyon](https://github.com/flyon)! - `.npmignore` was excluding the starter template's `defaults/app-with-backend/src/` (and `scripts/`) because the `src` pattern matched **anywhere** in the tree, overriding the `!defaults/**/*` re-include. The published tarball was missing all the template's TypeScript source files, so `linked create-app` was producing apps without `src/`.

  Anchor the cli's own-source ignore rules to the package root (`/src`, `/*.ts`, `/tsconfig.json`) and add an explicit `!defaults/**` re-include after.

## 1.4.2

### Patch Changes

- [#26](https://github.com/linked-cm/cli/pull/26) [`6e018c1`](https://github.com/linked-cm/cli/commit/6e018c11dedee787f818c01139b2ca53e184921e) Thanks [@flyon](https://github.com/flyon)! - Template now requires `@_linked/fuseki ^2.0` — that's the version which ships the `FusekiStore` config-object constructor that the new storage layout expects.

## 1.4.1

### Patch Changes

- [#24](https://github.com/linked-cm/cli/pull/24) [`c5d1321`](https://github.com/linked-cm/cli/commit/c5d13216bde74e591111a281253afcaf43c8bfb9) Thanks [@flyon](https://github.com/flyon)! - Template (`app-with-backend`) dep bumps so a fresh scaffold installs versions that match the APIs the template uses:
  - `@_linked/core: ^2.6` (needs `parseDatasetsConfig` + `loadStores`)
  - `@_linked/server: ^2.0` (needs the new `BackendAPIStore` config-object constructor + the dataset-terminology renames)
  - `@_linked/server-utils: ^1.0.5` (1.0.4 shipped an empty tarball)
  - `@_linked/react: ^1.3` (needs the loader/errorElement resolution chain + `_refresh` on `linkedSetComponent`)
  - `@_linked/cli: ^1.4` (template uses the loader bin)

  Also: `theme.css` top-comment no longer references the colours as "CN-branded" — they're just the default palette; users override `--color-primary-*` / `--color-secondary-*` to brand. README workspace-note generalized to "another repo's `packages/`" instead of a specific path.

## 1.4.0

### Minor Changes

- [#23](https://github.com/linked-cm/cli/pull/23) [`a00168d`](https://github.com/linked-cm/cli/commit/a00168d0e55a3f7f8164df1ea90e8fe52aefd5d4) Thanks [@flyon](https://github.com/flyon)! - Rename `LincdConfig` / `LincdWebpackConfig` / `LincdServerConfig` → `LinkedConfig` / `LinkedWebpackConfig` / `LinkedServerConfig`. Function `getLincdConfig` → `getLinkedConfig`. Legacy package.json flags `lincd: true` and `lincdApp: true` are no longer read — migrate to `linkedPackage: true` / `linkedApp: true`. Built loader registration is unaffected.

  Plus: CLI command help text refresh (`LINCD app` → `Linked app`, etc.). Config file name `lincd.config.{js,json}` → `linked.config.{js,json}` (hard cut, no fallback) — was previously rolled out separately.

- [#23](https://github.com/linked-cm/cli/pull/23) [`a00168d`](https://github.com/linked-cm/cli/commit/a00168d0e55a3f7f8164df1ea90e8fe52aefd5d4) Thanks [@flyon](https://github.com/flyon)! - Starter template: CN-branded CSS theme + `@_linked/react` integration in the example components.

  **Brand defaults.** The `app-with-backend` template now ships with the CN palette (`--color-primary-*` mapped to a teal-blue ramp, `--color-secondary-*` to mint green) as a default-branded baseline. Apps override `@theme { --color-primary-500: ... }` to swap brand.

  **Semantic-token shell.** `App.module.css`, `DefaultLayout.module.css`, `Header.module.css` rewritten using `@_linked/css` semantic tokens (`--bg-page`, `--bg-card`, `--color-primary-*`) instead of hardcoded hex. Module CSS files using `--spacing(N)` import `@_linked/css/package.css` per the documented pattern.

  **Person CRUD demo uses `@_linked/react`.** `PersonOverview` is now built with `linkedSetComponent`, and `PersonPreview` with `linkedComponent` — replacing the previous `useEffect` + `useState` query patterns. The wrappers handle loading state via the framework's `.ld-loader` and inject `_refresh` so the form (sibling) and rows (children) can trigger re-fetch. Optimistic UI on inline edit via `_refresh({givenName, familyName})`.

  **Pages polish.** `Home`, `Signin`, `Page1`, `PageNotFound` get card layouts using semantic tokens — consistent across routes.

  **`@_linked/react` is now a direct dep** in the scaffolded app's `package.json` so the bindings can be imported. Companion changes ship in `@_linked/react` (loader / errorElement API, `_refresh` on set, factory overloads) and `@_linked/css` (`.ld-loader` / `.ld-error` defaults + `--color-error-*` ramp).

  **Storage layout.** Template now ships `linked.backend.storage.ts` + `linked.backend.datasets.json` and a mirror `src/linked.frontend.storage.ts` + `src/linked.frontend.datasets.json`. Backend uses `loadStores` (async, dynamic-import). Frontend hardcodes the per-alias store mapping for webpack-friendly bundling.

  **npm + yarn compatibility.** `create-app` works with either package manager. Lockfile-based detection determines which to invoke for install.

  No breaking changes. Existing scaffolded apps that don't pull in the template updates keep working.

### Patch Changes

- [`67f01ab`](https://github.com/linked-cm/cli/commit/67f01abcbed04625175a5c82e584f09fee41cdea) - Remove `preflight.css` — moved to `@_linked/css`.

  `preflight.css` is a CSS asset; it belongs in the CSS package alongside `theme-defaults.css` and `utilities.css`. Consumers should update imports from `@_linked/cli/preflight.css` to `@_linked/css/preflight.css`.

  The exports entry `"./preflight.css": "./preflight.css"` is also removed from `package.json`.

- [`2b40588`](https://github.com/linked-cm/cli/commit/2b405880cbb21992c5005cb048f910df79c32145) - Relax `typescript` dep from `^5.7.3` to `^5.4.0` so consumers that pin a lower 5.x version (e.g. CN at 5.4.5) don't end up with a nested `typescript@5.9.x` install in `packages/cli/node_modules/`. The nested 5.9.x was incompatible with `react-refresh-typescript@2.0.12`'s AST walk — crashed frontend builds with `TypeError: Cannot read properties of undefined (reading 'declarations')` inside `VariableStatement.declarationList.declarations` traversal.

## 1.3.3

### Patch Changes

- [`8179c96`](https://github.com/linked-cm/cli/commit/8179c9627757be6c67de44e22b6ae7b08e83bcc1) - Remove webpack loader `./plugins/check-imports` from the package barrel (`src/index.ts`). The loader is CJS (uses `require()`) and was crashing ESM consumers at import time with "require is not defined in ES module scope". Webpack loads this file directly by path via `config-webpack.ts`, so no public export is needed. Also fix two relative imports in `tailwind.config.ts` and `utils.ts` that were missing `.js` extensions.

- [#19](https://github.com/linked-cm/cli/pull/19) [`eb1224e`](https://github.com/linked-cm/cli/commit/eb1224ea65ae65d7f534923b286d5daa0cdc151d) Thanks [@flyon](https://github.com/flyon)! - Remove `prepack: yarn build && pinst --disable` and `postpack: pinst --enable` scripts. These were conflicting with the CI publish flow (ENEEDAUTH on the actual `npm publish` call). Build now happens only in the dedicated CI "Build" step. Also remove `postinstall: husky install` (not needed for published installs).

## 1.3.2

### Patch Changes

- [#19](https://github.com/linked-cm/cli/pull/19) [`2111d11`](https://github.com/linked-cm/cli/commit/2111d113039c95304458e72c29dc2a58ca97ba16) Thanks [@flyon](https://github.com/flyon)! - Remove `prepack: yarn build && pinst --disable` and `postpack: pinst --enable` scripts. These were conflicting with the CI publish flow (ENEEDAUTH on the actual `npm publish` call). Build now happens only in the dedicated CI "Build" step. Also remove `postinstall: husky install` (not needed for published installs).

## 1.3.0

### Minor Changes

- [#17](https://github.com/linked-cm/cli/pull/17) [`3c81281`](https://github.com/linked-cm/cli/commit/3c81281ce9ef4b16c08f341923f6920b9b9c7f6b) Thanks [@flyon](https://github.com/flyon)! - Phase 0.3 accumulated changes:
  - **New `linked setup-publish` command**: scaffolds a changesets-based publish workflow in any package repo. Supports single-branch (default) and `--dual-branch` (main + dev with `@next` prereleases). Patches package.json (publishConfig + changesets devDeps), generates package-lock.json in an isolated tmpdir, writes `.github/workflows/{ci,publish,changeset-check}.yml`, and optionally configures GitHub branch protection via `--configure-github` (uses `gh` CLI).
  - **`linked build-workspace` now invokes each package's own `yarn build` script** instead of the internal buildPackage pipeline. Lets @\_linked/core use pure tsc, pure-CSS packages use no-ops, and lincd-style packages use `yarn linked build`.
  - **`linked yarn` (safeYarn) gains `LINKED_YARN_DRY_RUN` env** for testing arg forwarding without executing.
  - **Import checker is warn-only** (was fatal): emits yellow warnings listing missing `.js` extensions but doesn't abort the build.
  - **compilePackageESM/CJS** skip gracefully when tsconfig-{esm,cjs}.json is absent (pure-CSS packages).
  - **Dual-package step** uses `npx tsconfig-to-dual-package` so the binary resolves from nearest node_modules.
  - **runOnPackagesGroupedByDependencies**: tolerate packages without `dependencies` field.
  - **Package template modernized**: uses `yarn linked build` pattern (matches foundational packages), Gruntfile removed.
  - **App template**: adds `mrgit-template.json`, `yarn setup` script, `linkedApp: true` flag, `mrgit` devDep.
  - **`linkedPackage: true` / `linkedApp: true`** flags added to cli-methods readers (alongside legacy `lincd` / `lincdApp` for transition period).
  - **Bug fix**: lingering `lincd-server/*` imports in LincdServer.tsx migrated to `@_linked/server/*`.

All notable changes to `@_linked/cli` (formerly `lincd-cli`) are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

## [1.2.11] - 2026-04-22

### Changed

- **Renamed package**: `lincd-cli` → `@_linked/cli`. Repo moved from `semantu/lincd-cli` → `linked-cm/cli`.
- **Primary binary** is now `linked` (with `lnk` as a short alias).
- **Flag in package.json** is now `linkedPackage: true` (packages) / `linkedApp: true` (apps). The legacy flags `lincd: true` / `lincdApp: true` are still read for a transition period.
- **Package template** (`defaults/package/`) no longer ships a `Gruntfile.js`. New packages use `rimraf + tsc + tsconfig-to-dual-package` for dual ESM/CJS output.
- **App template** (`defaults/app-with-backend/`) now includes `mrgit-template.json`, a `yarn setup` script, and `mrgit` as a devDep. Run `yarn setup` after `linked create-app` to optionally clone sibling `@_linked/*` repos for local development.

### Added

- `linked build-workspace` — builds all linked packages in the current workspace in dependency order. Supports `-u` (updated only) and `--use-git` (git-based change detection). Migrated from `@semantu/cli`.
- `linked build-package <filepath>` — given a file path, walks up to the nearest `package.json` and rebuilds that package. Designed for editor save hooks. Migrated from `@semantu/cli`.
- `linked yarn <args>` — safe-yarn wrapper that preserves nested repo yarn.lock files during root-level yarn commands (for mrgit workflows). Migrated from `@semantu/cli`.

### Deprecated

- The `lincd` binary is retained as a deprecated alias that prints a warning to stderr on invocation. It will be removed in a future major release; migrate scripts to `linked`.
- `generateGruntConfig` export has been removed; it had no active callers. If you still reference it, migrate your package build to `tsc + tsconfig-to-dual-package` (see the package template).

### Removed

- Grunt bin entry (`grunt`) removed from package.json bins.
- Internal `config-grunt.cts` and `getGruntConfig` helper removed.
- Grunt-related devDependencies (`grunt`, `grunt-cli`, `grunt-*`, `@lodder/grunt-postcss`, `load-grunt-tasks`) removed.

### Migration notes

- Update `package.json` deps: `lincd-cli` → `@_linked/cli`.
- Update `package.json` flag: `lincd: true` → `linkedPackage: true` (and `lincdApp: true` → `linkedApp: true` for apps). Legacy flags still read for now.
- Update scripts: `yarn lincd <cmd>` → `yarn linked <cmd>`. The legacy alias still works but emits a deprecation warning.
- Update import paths: `lincd-cli/<module>` → `@_linked/cli/<module>`.
