---
'@_linked/cli': minor
---

Add `linked start --api-only` for a Linked backend without a web frontend.

- No `vite.config.*` is required: without one, Vite runs with the `createViteConfig()` defaults inline, so TypeScript, decorators and extensionless imports in source-only shape packages still work.
- No `src/App.tsx` or `src/routes.tsx` is loaded. The CLI sets `server.apiOnly` on the LinkedServer config instead of the page rendering hooks, so `/call/...` and `/api/...` routes are served and page requests get a 404 (needs a `@_linked/server` release that honours `server.apiOnly`).
- The mode is explicit and never inferred from missing files. `server.apiOnly: true` in `linked.config.js` turns it on too.
- `LinkedServerConfig` gains the `apiOnly` field.

Add `"linked": {"extensionlessImports": true}` to a package's `package.json` for packages whose source uses extensionless relative imports (for example, shapes shared with React Native, where Metro does not map `.js` specifiers to `.ts` source).

- `linked build` skips the "Checking imports" step for that package and logs that it did.
- After compiling ESM, it appends `.js` (or `/index.js` for a directory) to extensionless `./` and `../` specifiers of static imports, exports and `import()` calls in `lib/esm/**/*.js`, so the output loads under Node. Specifiers it cannot resolve are left unchanged with a warning. `.d.ts` files are not rewritten.
- Packages without the field build exactly as before.
