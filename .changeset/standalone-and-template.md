---
"@_linked/cli": minor
---

Standalone dev + template git-clone scaffolding:

- **Standalone dev resolution** — `createViteConfig` now detects when an app is NOT inside a workspace (lib-only npm install of `@_linked/*`) and resolves those deps via `import → lib/esm` (conditions `['module','node']`) instead of the `development → src` export they don't ship. Fixes "Failed to load `@_linked/server/shapes/LinkedServer`" on a clean install. Monorepo/workspace dev is unchanged.
- **`create-app` clones the template repo** — new apps are scaffolded by `git clone`-ing `linked-cm/app-template` (single source of truth, same repo CN's server-side project creation uses) instead of copying a bundled defaults tree. The bundled `defaults/app-with-backend` is removed.
- Removed the orphaned tsx `register`/`register-css-only` loaders (+ `tsx` dep); apps run plain `linked start` (Vite handles TS transform).
