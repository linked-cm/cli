# Changelog

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
