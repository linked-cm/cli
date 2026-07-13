---
"@_linked/cli": minor
---

Native `.env` support, app-name for the client bundle, and standalone SSR single-instance fixes.

- **`.env` loading** — `ensureEnvironmentLoaded` now loads the app environment from a flat `.env` via Node's native `process.loadEnvFile` (no `env-cmd` dependency) when no `.env-cmdrc.json` is present. `.env-cmdrc.json` still takes priority when it exists (profile-based, honours `--env a,b`), so existing apps are unaffected. When neither file exists the cli no longer hard-exits — it relies on the ambient environment (e.g. env injected by a host at spawn time). The original shell environment is still re-applied last, so it wins over file values.
- **`process.env.APP_NAME`** is now inlined into the client bundle (like `SITE_ROOT`/`NODE_ENV`), so components can render the app display name; defaults to `'Linked App'` when unset.
- **Standalone SSR** now dedupes and bundles the React-context holders (`@_linked/server-utils`, `@_linked/react`) into a single instance, fixing a null `AppContext` during SSR in ejected/standalone apps.
