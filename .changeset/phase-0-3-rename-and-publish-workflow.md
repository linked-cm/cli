---
'@_linked/cli': minor
---

Phase 0.3 accumulated changes:

- **New `linked setup-publish` command**: scaffolds a changesets-based publish workflow in any package repo. Supports single-branch (default) and `--dual-branch` (main + dev with `@next` prereleases). Patches package.json (publishConfig + changesets devDeps), generates package-lock.json in an isolated tmpdir, writes `.github/workflows/{ci,publish,changeset-check}.yml`, and optionally configures GitHub branch protection via `--configure-github` (uses `gh` CLI).
- **`linked build-workspace` now invokes each package's own `yarn build` script** instead of the internal buildPackage pipeline. Lets @_linked/core use pure tsc, pure-CSS packages use no-ops, and lincd-style packages use `yarn linked build`.
- **`linked yarn` (safeYarn) gains `LINKED_YARN_DRY_RUN` env** for testing arg forwarding without executing.
- **Import checker is warn-only** (was fatal): emits yellow warnings listing missing `.js` extensions but doesn't abort the build.
- **compilePackageESM/CJS** skip gracefully when tsconfig-{esm,cjs}.json is absent (pure-CSS packages).
- **Dual-package step** uses `npx tsconfig-to-dual-package` so the binary resolves from nearest node_modules.
- **runOnPackagesGroupedByDependencies**: tolerate packages without `dependencies` field.
- **Package template modernized**: uses `yarn linked build` pattern (matches foundational packages), Gruntfile removed.
- **App template**: adds `mrgit-template.json`, `yarn setup` script, `linkedApp: true` flag, `mrgit` devDep.
- **`linkedPackage: true` / `linkedApp: true`** flags added to cli-methods readers (alongside legacy `lincd` / `lincdApp` for transition period).
- **Bug fix**: lingering `lincd-server/*` imports in LincdServer.tsx migrated to `@_linked/server/*`.
