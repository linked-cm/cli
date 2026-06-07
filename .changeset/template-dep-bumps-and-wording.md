---
'@_linked/cli': patch
---

Template (`app-with-backend`) dep bumps so a fresh scaffold installs versions that match the APIs the template uses:

- `@_linked/core: ^2.6` (needs `parseDatasetsConfig` + `loadStores`)
- `@_linked/server: ^2.0` (needs the new `BackendAPIStore` config-object constructor + the dataset-terminology renames)
- `@_linked/server-utils: ^1.0.5` (1.0.4 shipped an empty tarball)
- `@_linked/react: ^1.3` (needs the loader/errorElement resolution chain + `_refresh` on `linkedSetComponent`)
- `@_linked/cli: ^1.4` (template uses the loader bin)

Also: `theme.css` top-comment no longer references the colours as "CN-branded" — they're just the default palette; users override `--color-primary-*` / `--color-secondary-*` to brand. README workspace-note generalized to "another repo's `packages/`" instead of a specific path.
