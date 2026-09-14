---
'@_linked/cli': minor
---

`create-app --template react-native` now scaffolds the Linked backend next to the app.

- `services/api`: an API-only Linked backend (`linked start --api-only`) on `@_linked/server`, with Fuseki through `linked.backend.datasets.json`, a local file store (or `S3FileStore` when the S3 variables are set), a Fuseki reachability check and `node --test` unit tests.
- A root `docker-compose.yml` for Fuseki (`secoresearch/fuseki:5.5.0`, host port `FUSEKI_PORT`), root scripts `fuseki:up`, `fuseki:down`, `api`, `check:react`, `lint`, `typecheck`, `test` and `test:integration`, a root ESLint flat config (with a rule that keeps `apps/mobile` on `@_linked/server` subpath imports) and a "Before every PR" checklist in the README (the template ships no CI workflow).
- Pins `@_linked/server` 2.2.0 and `@_linked/cli` 1.13.0.
- `apps/mobile/babel.config.js` registers a Babel plugin that strips JSON import attributes (`import('x.json', { with: { type: 'json' } })`), so Metro bundles Linked ontology packages.
- `resolveApiUrl` ignores a non-string `extra.apiUrl`: the dev-client manifest delivers `null` as `{}`, which crashed the app with "LincdServerProxy requires a root URL".
- `apps/mobile` imports `@_linked/react/native` (1.5.0) instead of its own render defaults, resolves the API URL in `app.config.ts` and `src/shell/env.ts`, and sends queries to the API through `BackendAPIStore`. The root `overrides` entry is gone.
- An example add/edit/delete screen (`PersonOverview`, `PersonPreview`), ported from the web app-template to React Native with `@_linked/schema`'s `Person`, with a Jest integration test against the running API and Fuseki.
- The shapes package sets `"linked": {"extensionlessImports": true}`, so `linked build` emits Node-loadable `lib/esm`.
- With `linked.extensionlessImports`, `linked build` fails when `lib/esm` was not emitted (no `tsconfig-esm.json`), finishes "with warnings" listing every relative specifier it could not resolve, and handles `'.'`, `'..'` and `'./dir/'`. `linked build` now exits non-zero when the build fails.
- README: documents `linked start --api-only` / `server.apiOnly`, the `extensionlessImports` flag, and the react-native template as it is now.
- The Fuseki dataset names (`<prefix>-dev`, `<prefix>-test`) are stamped from the app prefix.
- Shipped dotfiles are restored at any depth, and `env.example.template` becomes `.env.example`.
