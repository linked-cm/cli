---
summary: How createViteConfig keeps the @_linked/* framework packages single-instance across the browser and Node (SSR) runtimes, and the workspace vs standalone resolution modes.
---

# Vite runtime config — two runtimes, single framework instance

A linked app runs in **two JavaScript runtimes**:

- **Browser** — the client bundle Vite builds.
- **Node** — the backend (providers, storage, SSR render), loaded in dev via `vite.ssrLoadModule`.

Each runtime instantiates its own copy of the framework packages. Within a *single*
runtime, the stateful framework packages — `@_linked/core` (shape registry,
`LinkedStorage`, query context) and everything that registers into it — **must be one
module instance**. Two copies in one runtime split that state and mangle shape identity
(`Person`→`Person2`), which breaks cross-runtime shape lookup.

`createViteConfig` enforces single-instance per runtime. The packages it applies to are
one constant — the single source of truth for every lever below:

```ts
const FRAMEWORK_PKG_PATTERNS = [/^@_linked\//, /^lincd-/];
```

## Two resolution modes

`createViteConfig` detects its mode via `discoverWorkspaces()`:

- **Workspace mode** — the CN monorepo and its workspace-member clones. The framework
  packages ship `src/` and resolve there (for HMR).
- **Standalone mode** — a CLI-created app with published, lib-only deps. The framework
  packages are installed from npm as `lib/esm`.

## The levers

| Runtime | Lever | Workspace | Standalone |
|---|---|---|---|
| Browser | `optimizeDeps.exclude` | exclude workspace members | exclude the app's framework deps (`linkedDeps`) |
| Node (SSR) | `ssr.noExternal` | force-**bundle** framework pkgs (→ one `src` instance) | `[]` — leave **external** (Node loads one `lib/esm` copy) |
| Node (SSR) | `ssr.resolve.conditions` | Vite defaults (`development → src` for HMR) | `['module','node']` (→ `import → lib/esm`) |

**Why *exclude* on the browser, not just dedupe:** Vite's dep-optimizer (browser-only)
pre-bundles each *subpath* import into its own chunk, and each chunk inlines its own
copy of `@_linked/core` → duplication. Excluding the framework packages lets the
browser's native ESM graph load one module per URL. (These packages are ESM with no
bare-CJS runtime deps — e.g. `classnames` is inlined in `@_linked/react` — so
native-ESM serving needs no interop shim.)

**Why *bundle* in workspace but *externalize* in standalone on the backend:** both give
one instance, by different routes. Workspace force-bundles from `src` (a source-shipping
clone has no usable `lib`); standalone externalizes to Node, which dedupes by resolved
path. Mixing the two — some framework code bundled, some external — would create two
instances in the backend runtime → state split ("No query dispatch configured").

## Adding a framework package

Add its scope to `FRAMEWORK_PKG_PATTERNS`. That one edit covers every lever above.
