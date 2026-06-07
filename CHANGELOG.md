# Changelog

## 1.7.0

### Minor Changes

- [#50](https://github.com/linked-cm/cli/pull/50) [`182b907`](https://github.com/linked-cm/cli/commit/182b9075d806121b0324bf9c2c956ace549e50e2) Thanks [@flyon](https://github.com/flyon)! - `create-app` now picks between npm and yarn deliberately instead of silently preferring yarn:
  - If only one of `npm` / `yarn` is on `PATH`, that one is used.
  - If both are installed AND the user is running interactively, `create-app` asks `Package manager [npm/yarn] (default: yarn):`. Empty answer keeps the old default (yarn). Typing `npm` or `yarn` overrides.
  - If both are installed but flags (`--app-name` / `--app-prefix` / `--app-domain`) were passed, no prompt — yarn wins, matching the previous non-interactive default.
  - The chosen package manager flows through the install step AND the final "next command" hint, so the copy-paste line at the end is always `cd my-app && npm start` or `cd my-app && yarn start` matching what was actually installed (instead of always showing `npm start` with a yarn comment).

  Why this matters: scaffolding with yarn but then running `npm start` (without re-running `npm install`) used to leave critical packages unresolved at webpack-compile time. Picking one PM and reusing it removes that footgun.

## 1.6.4

### Patch Changes

- [#48](https://github.com/linked-cm/cli/pull/48) [`dce9cb5`](https://github.com/linked-cm/cli/commit/dce9cb5e669b40f131494bbf5ed5c6990bb02cb3) Thanks [@flyon](https://github.com/flyon)! - Template `tsconfig.json` switched from `moduleResolution: "node"` to `moduleResolution: "bundler"`. The classic Node resolver doesn't honor the `exports` field in package.json, and `@_linked/react` (and friends) declare types only inside `exports[".".types]`, not as a top-level `types` field. The result was a fresh scaffold compiling cleanly with yarn install but exploding under webpack/ts-loader:

  ```
  TS2307: Cannot find module '@_linked/react' or its corresponding type declarations.
    There are types at '.../node_modules/@_linked/react/lib/esm/index.d.ts', but
    this result could not be resolved under your current 'moduleResolution' setting.
    Consider updating to 'node16', 'nodenext', or 'bundler'.
  ```

  `bundler` is the right choice for a webpack-bundled app — it honors `exports`, doesn't require `.js` extensions on relative imports, and doesn't enforce full ESM strictness.

## 1.6.3

### Patch Changes

- [#46](https://github.com/linked-cm/cli/pull/46) [`c1aa8d4`](https://github.com/linked-cm/cli/commit/c1aa8d49306a26513eb4826ab5ed9cbb98bc01d1) Thanks [@flyon](https://github.com/flyon)! - Two install-time fixes:
  - **Template `eslint-plugin-react-hooks` bumped to `latest`** (from `^4.6.0`). The old range maxed out at eslint 8, but `eslint: "latest"` resolves to 10, so a fresh `npm install` after `create-app` blew up with `ERESOLVE could not resolve peer eslint`. Yarn was permissive enough to silently accept the mismatch, which is how it slipped past create-app's install step.
  - **Install spinner no longer swallows warnings.** Even on a 0-exit install, stderr (peer-dep warnings, deprecations, ERESOLVE warns) is now printed under the green checkmark. Silent installs hide real problems that bite users the moment they touch the lockfile.

## 1.6.2

### Patch Changes

- [#44](https://github.com/linked-cm/cli/pull/44) [`e366008`](https://github.com/linked-cm/cli/commit/e366008075ddee7774a30ae4d99d4acf30582b90) Thanks [@flyon](https://github.com/flyon)! - `linked start` no longer aborts standalone (non-workspace) apps. `getLincdPackages()` used to print "Could not find package workspaces" and call `process.exit()` when no `workspaces` field was present in the nearest `package.json`. That broke `npm start` for every `npx @_linked/cli create-app …` scaffold, since the resulting app is a single-package repo with no workspaces.

  It now returns `[]` in that case — there simply are no local workspace packages to scan, which is the correct answer for a standalone app. Monorepo behavior is unchanged.

## 1.6.1

### Patch Changes

- [#42](https://github.com/linked-cm/cli/pull/42) [`81ac274`](https://github.com/linked-cm/cli/commit/81ac2740d9d98b1755a27c54174e6225a45da158) Thanks [@flyon](https://github.com/flyon)! - Stripped `@_linked/auth` from the default scaffold. It was wired in (`<ProvideAuth>` in `App.tsx`, `RequireAuth` import in `routes.tsx`) but no signin provider was configured, so it did nothing — while still dragging the entire legacy `lincd-*` chain (`foaf`, `lincd-input`, `lincd-mui-base`, `lincd-rdfs`, `lincd-sioc`) into the dep tree and crashing on startup with `Error: Multiple versions of LINCD are loaded` (both `lincd@1.0.3` and `@_linked/core` claim the same `globalThis.lincd` key).

  To add sign-in back: `yarn add @_linked/auth`, wrap `<AppRoutes/>` in `<ProvideAuth>`, import `RequireAuth`, set `requireAuth: true` on the route you want protected. Inline comments in `App.tsx` and `routes.tsx` show where.

## 1.6.0

### Minor Changes

- [#40](https://github.com/linked-cm/cli/pull/40) [`582ad13`](https://github.com/linked-cm/cli/commit/582ad13dc947d59b51df499dc223260f602c1b09) Thanks [@flyon](https://github.com/flyon)! - Simplified the package to ship a single bin (`linked`). The legacy `lincd`, `lincd-cli`, and `lnk` aliases are gone.

  With only one bin, npx can resolve it without `-p`:

  ```sh
  npx @_linked/cli@latest create-app my-app
  ```

  If you previously used `lincd` or `lincd-cli` from `@_linked/cli` (the deprecation shim), switch to `linked`. The `lnk` short alias was undocumented and has been removed alongside.

## 1.5.2

### Patch Changes

- [#38](https://github.com/linked-cm/cli/pull/38) [`d56f6ab`](https://github.com/linked-cm/cli/commit/d56f6ab8c006e7204216ba8a0781f5cd23f98334) Thanks [@flyon](https://github.com/flyon)! - Template polish + create-app UX:
  - **Cleaner install output.** The verbose `Replacing variables in files …` log is gone. `yarn install` / `npm install` output is now hidden behind an `ora` spinner during scaffolding — on failure, the captured stdout/stderr is dumped so you still see what went wrong.
  - **Page1 tabs render only after mount.** Radix's `useId()` auto-IDs drift between `<StaticRouter>` (server) and `<BrowserRouter>` (client) trees, producing an `aria-controls did not match` React hydration warning. The showcase now defers `Tabs.Root` to after hydration so the warning is gone. The header still renders during SSR so the page isn't blank on first paint.
  - **Inactive tab panels stay hidden.** Added a `.TabPanel[hidden], .TabPanel[data-state='inactive'] { display: none; }` rule so the grid layout no longer overrides Radix's `[hidden]` attribute and leaks empty grid containers below the active tab.
  - **Bumped template fuseki dep to `^2.0.1`** which has `[FusekiStore] SPARQL …` per-query logs gated behind `DEBUG_FUSEKI=1`.

## 1.5.1

### Patch Changes

- [#36](https://github.com/linked-cm/cli/pull/36) [`fc37baa`](https://github.com/linked-cm/cli/commit/fc37baa54874d64349622b56b05d14f691bafb1c) Thanks [@flyon](https://github.com/flyon)! - The components-showcase page (`/page1`) is now a public route by default — the template doesn't wire up an authentication provider out of the box, so `requireAuth` would just hide the page behind a redirect to a non-functional signin. The `requireAuth: true` line is now commented out with a note pointing readers to `@_linked/auth` when they want to add it.

  Top-of-file comment in `Page1.tsx` updated to match.

## 1.5.0

### Minor Changes

- [#34](https://github.com/linked-cm/cli/pull/34) [`4138d8f`](https://github.com/linked-cm/cli/commit/4138d8fbbee6c5def8538d2297bedd5c0ed3e4e7) Thanks [@flyon](https://github.com/flyon)! - Template visual upgrade: animated background + primitives showcase.

  **Animated background.** `App.module.css` now renders a fixed-position layer underneath all content with three soft radial-gradient blobs that drift and gently pulse on a 22s loop. Brand-colored via `--color-primary-300` / `--color-secondary-300` / `--color-tertiary-200`, so the look re-tints automatically when an app overrides theme tokens. Honors `prefers-reduced-motion: reduce`.

  **Protected page** (`/page1`) reworked into a `@_linked/primitives` showcase, organized into `Tabs` (Forms / Display / Buttons). Exercises `Button` (variants, colors, sizes), `Input`, `Switch`, `Checkbox`, `RadioGroup`, `Slider`, `Progress`, `Avatar`, `Label`, `Separator` — useful both as a visual smoke-test of the active theme and as starter code showing how to reach for each primitive.

  `@_linked/primitives` added as a template dep (`^1.0.6`).

## 1.4.5

### Patch Changes

- [#32](https://github.com/linked-cm/cli/pull/32) [`2f0b4d3`](https://github.com/linked-cm/cli/commit/2f0b4d349b98eea9271fad9028a2ddae824bcd29) Thanks [@flyon](https://github.com/flyon)! - Template's `@_linked/auth` dep range bumped from `~1.0` (which pinned to the broken 1.0.x empty-tarball releases) to `^1.1.0` (which has the actual `lib/`). Same for `@_linked/server-utils` (`^1.0.5` → `^1.0.6`) and `@_linked/schema` (`^1.0` → `^1.0.6` — both versions were empty before 1.0.6).

  Also fixes `PersonPreview.tsx` template: `Person.update(...).for(source)` and `Person.delete(source)` now pass `{ id: source.id }` with an early-return guard, since `source.id` is optional on the shape type.

## 1.4.4

### Patch Changes

- [#30](https://github.com/linked-cm/cli/pull/30) [`420c735`](https://github.com/linked-cm/cli/commit/420c7350741e5e2c1b7b76ecbaa4608a9b7ae4f0) Thanks [@flyon](https://github.com/flyon)! - `defaults/package/package.json` (the `linked create-package` template) now uses the explicit per-step build pipeline instead of `yarn linked build`. The wrapper script was silently swallowing TS compile errors and shipping empty tarballs — the exact same bug that affected every existing `@_linked/*` package built with it.

  New packages created via `linked create-package` now ship with a build script that fails loudly on real errors and produces complete `lib/esm/` + `lib/cjs/` output.

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
