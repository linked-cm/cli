---
'@_linked/cli': minor
---

Add `linked start --api-only` for a Linked backend without a web frontend.

- No `vite.config.*` is required: without one, Vite runs with the `createViteConfig()` defaults inline, so TypeScript, decorators and extensionless imports in source-only shape packages still work.
- No `src/App.tsx` or `src/routes.tsx` is loaded. The CLI sets `server.apiOnly` on the LinkedServer config instead of the page rendering hooks, so `/call/...` and `/api/...` routes are served and page requests get a 404 (needs a `@_linked/server` release that honours `server.apiOnly`).
- The mode is explicit and never inferred from missing files. `server.apiOnly: true` in `linked.config.js` turns it on too.
- `LinkedServerConfig` gains the `apiOnly` field.
