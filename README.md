# @_linked/cli

Command-line tools for the `@_linked/*` packages and apps.

## Install

```bash
npm install --save-dev @_linked/cli
# or
yarn add -D @_linked/cli
```

## Binaries

Three executables ship in this package:

- `linked` — primary command
- `lnk` — short alias for `linked`
- `lincd` — deprecated alias; prints a warning and forwards to `linked`. Will be removed in a future major release.

## Commands

Run `linked --help` for the full list. The commonly used ones:

### App scaffolding

```bash
linked create-app <name>          # scaffold a new app (interactive)
linked create-package <name>      # scaffold a new linkedPackage
linked create-shape <name>        # add a shape file to the current package
linked create-component <name>    # add a React component file
```

### Building

```bash
linked build                      # build the current package (tsc + checks)
linked build-app                  # build frontend + backend for the current app
linked build-workspace            # build all linked packages in the workspace in dependency order
linked build-updated              # incremental: only packages that changed since last build
linked build-package <file>       # walk up from a file path to find its package and rebuild
```

### Publishing / release

```bash
linked setup-publish              # install a changesets-based publish workflow in the current repo
linked setup-publish --dual-branch          # use main + dev with @next prereleases
linked setup-publish --configure-github     # also set branch protection via gh CLI
linked setup-publish --scope community      # use NPM_AUTH_TOKEN_CM instead of NPM_AUTH_TOKEN
```

`setup-publish` writes:

- `.github/workflows/ci.yml`, `publish.yml`, `changeset-check.yml`
- `.changeset/config.json` + `README.md`
- `.gitignore` entries
- `publishConfig: {access: public}` + `@changesets/cli` devDeps in `package.json`
- `package-lock.json` (via isolated tmpdir)

### Dev workflow

```bash
linked start                      # run the dev server (app)
linked dev                        # file-watch rebuild (package)
linked yarn <args>                # safe-yarn: run yarn at root while preserving nested yarn.lock files
```

### Registry / dev utilities

```bash
linked publish                    # publish the current package (for non-CI flows)
linked register                   # register the package to the linked registry
linked status                     # show which packages need build/publish
linked depcheck                   # check for missing/unused deps
```

## Package flags

The CLI recognizes two flags in `package.json`:

```json
{
  "linkedPackage": true,     // marks a reusable library; build-workspace builds it
  "linkedApp": true          // marks a deployable app; build-workspace skips it
}
```

The legacy `lincd: true` / `lincdApp: true` flags are no longer read. Migrate to `linkedPackage` / `linkedApp`.

## Development

```bash
cd packages/cli
yarn build
```

Dual ESM + CJS build via `tsconfig-to-dual-package`. Sources in `src/`, output in `lib/esm/` and `lib/cjs/`.

### Templates

Templates live in `defaults/`:

- `defaults/app-with-backend/` — used by `linked create-app`
- `defaults/app-static/` — minimal static app
- `defaults/package/` — used by `linked create-package`
- `defaults/setup-publish/` — workflow + changeset files written by `linked setup-publish` (single-branch default; `dual-branch/` subdirectory for the `--dual-branch` variant)

### `linked create-app` template structure

`linked create-app <name>` copies `defaults/app-with-backend/` to the new app's folder, substitutes `${name}` / `${hyphen_name}` / `${app_prefix}` / `${app_domain}` placeholders in selected files, and copies `linked.backend.datasets.example.json` → `linked.backend.datasets.json` so first boot works zero-config.

Storage configuration follows the two-layer pattern from [backlog 016](https://github.com/create-now/docs/blob/main/docs/backlog/016-ejection-export-flow.md) (canonical spec) + the symmetric backend/frontend split:

| File | Side | Role | Git |
|---|---|---|---|
| `linked.backend.storage.ts` | backend | Shape→alias routing. Uses `parseDatasetsConfig` + `loadStores` from `@_linked/core`; calls `LinkedStorage.setDefaultDataset(...)` / `setDatasetForShapes(...)`. | committed |
| `linked.backend.datasets.json` | backend | Alias → `{ store, config }`. `store` is an npm import path; `config` is the store class's constructor arg. `${VAR:-default}` placeholders resolved at boot. | **gitignored** |
| `linked.backend.datasets.example.json` | backend | Template / seed for the gitignored file. Has placeholders matching env vars. | committed |
| `src/linked.frontend.storage.ts` | frontend | Same shape→alias model; imports store classes explicitly (webpack-bundle-safe), constructs per alias. | committed |
| `src/linked.frontend.datasets.json` | frontend | Frontend alias → `{ store, config }`. Public values only — never put secrets here, it ships in the browser bundle. | committed |

Conventions:
- Aliases on the two sides are **independent**. The framework re-routes by shape on each side; matching alias names between FE and BE is convention, not a framework requirement.
- The backend dispatcher is registry-free (dynamic `await import(entry.store)`). The frontend hardcodes each `new StoreClass(config)` because webpack can't bundle dynamic imports of arbitrary npm specifiers.
- Each store class accepts a single config-object constructor argument — `new FusekiStore({ endpoint, credentials? })`, `new BackendAPIStore({ name?, id? })`.

## Repository

`linked-cm/cli` on GitHub. License: MPL-2.0.
