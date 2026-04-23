# Changelog

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
