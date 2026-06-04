---
'@_linked/cli': minor
---

Starter template: CN-branded CSS theme + `@_linked/react` integration in the example components.

**Brand defaults.** The `app-with-backend` template now ships with the CN palette (`--color-primary-*` mapped to a teal-blue ramp, `--color-secondary-*` to mint green) as a default-branded baseline. Apps override `@theme { --color-primary-500: ... }` to swap brand.

**Semantic-token shell.** `App.module.css`, `DefaultLayout.module.css`, `Header.module.css` rewritten using `@_linked/css` semantic tokens (`--bg-page`, `--bg-card`, `--color-primary-*`) instead of hardcoded hex. Module CSS files using `--spacing(N)` import `@_linked/css/package.css` per the documented pattern.

**Person CRUD demo uses `@_linked/react`.** `PersonOverview` is now built with `linkedSetComponent`, and `PersonPreview` with `linkedComponent` — replacing the previous `useEffect` + `useState` query patterns. The wrappers handle loading state via the framework's `.ld-loader` and inject `_refresh` so the form (sibling) and rows (children) can trigger re-fetch. Optimistic UI on inline edit via `_refresh({givenName, familyName})`.

**Pages polish.** `Home`, `Signin`, `Page1`, `PageNotFound` get card layouts using semantic tokens — consistent across routes.

**`@_linked/react` is now a direct dep** in the scaffolded app's `package.json` so the bindings can be imported. Companion changes ship in `@_linked/react` (loader / errorElement API, `_refresh` on set, factory overloads) and `@_linked/css` (`.ld-loader` / `.ld-error` defaults + `--color-error-*` ramp).

**Storage layout.** Template now ships `linked.backend.storage.ts` + `linked.backend.datasets.json` and a mirror `src/linked.frontend.storage.ts` + `src/linked.frontend.datasets.json`. Backend uses `loadStores` (async, dynamic-import). Frontend hardcodes the per-alias store mapping for webpack-friendly bundling.

**npm + yarn compatibility.** `create-app` works with either package manager. Lockfile-based detection determines which to invoke for install.

No breaking changes. Existing scaffolded apps that don't pull in the template updates keep working.
