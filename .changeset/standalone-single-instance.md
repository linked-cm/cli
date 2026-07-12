---
"@_linked/cli": minor
---

- Standalone apps: framework packages (`@_linked/*` / `lincd-*`) are excluded from Vite's dep-optimizer so the browser loads one copy of each — fixes class-name duplication (`Person`→`Person2`) that broke cross-runtime shape lookup and the app's write path.
- The client build now defines `process.env.SITE_ROOT` / `NODE_ENV` (webpack `EnvironmentPlugin` parity); apps add their own public env vars via `define` in their `vite.config.ts`.
- A single `FRAMEWORK_PKG_PATTERNS` constant now drives every single-instance lever (`optimizeDeps.exclude`, `ssr.noExternal`).
