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

Fix linked-package discovery in `linked start` for apps inside an npm/yarn workspaces monorepo: dependencies are now resolved the way Node resolves them, walking up parent `node_modules` directories to the workspace root. A linked package hoisted to the root `node_modules` is found, so the app no longer falls into standalone mode (which dropped the `development` export condition).

In workspace mode, `linked start` now bundles only the discovered source workspaces through Vite SSR (`ssr.noExternal`). Published framework packages installed in `node_modules` (such as `@_linked/core`) stay external and load through Node. Before, every `@_linked/*` package was force-bundled, so Vite ran its own `@_linked/core` while a store loaded by core's `loadStores` through a native `import()` (for example `@_linked/fuseki/shapes/FusekiStore`) pulled in a second, Node-loaded core. That split the shape registry ("Cannot resolve an rdf:type for shape"). An installed package that depends (directly or transitively, through `dependencies` or `peerDependencies`) on a discovered workspace is bundled too. For example, when `@_linked/core` is itself a source workspace, a published `@_linked/fuseki` goes through Vite and uses the same core. Only the dependency closure of the app and its workspaces is scanned.
