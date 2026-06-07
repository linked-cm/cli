---
"@_linked/cli": patch
---

Template polish + create-app UX:

- **Cleaner install output.** The verbose `Replacing variables in files …` log is gone. `yarn install` / `npm install` output is now hidden behind an `ora` spinner during scaffolding — on failure, the captured stdout/stderr is dumped so you still see what went wrong.
- **Page1 tabs render only after mount.** Radix's `useId()` auto-IDs drift between `<StaticRouter>` (server) and `<BrowserRouter>` (client) trees, producing an `aria-controls did not match` React hydration warning. The showcase now defers `Tabs.Root` to after hydration so the warning is gone. The header still renders during SSR so the page isn't blank on first paint.
- **Inactive tab panels stay hidden.** Added a `.TabPanel[hidden], .TabPanel[data-state='inactive'] { display: none; }` rule so the grid layout no longer overrides Radix's `[hidden]` attribute and leaks empty grid containers below the active tab.
- **Bumped template fuseki dep to `^2.0.1`** which has `[FusekiStore] SPARQL …` per-query logs gated behind `DEBUG_FUSEKI=1`.
