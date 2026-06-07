---
"@_linked/cli": minor
---

Simplified the package to ship a single bin (`linked`). The legacy `lincd`, `lincd-cli`, and `lnk` aliases are gone.

With only one bin, npx can resolve it without `-p`:

```sh
npx @_linked/cli@latest create-app my-app
```

If you previously used `lincd` or `lincd-cli` from `@_linked/cli` (the deprecation shim), switch to `linked`. The `lnk` short alias was undocumented and has been removed alongside.
