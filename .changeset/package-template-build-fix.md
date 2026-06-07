---
'@_linked/cli': patch
---

`defaults/package/package.json` (the `linked create-package` template) now uses the explicit per-step build pipeline instead of `yarn linked build`. The wrapper script was silently swallowing TS compile errors and shipping empty tarballs — the exact same bug that affected every existing `@_linked/*` package built with it.

New packages created via `linked create-package` now ship with a build script that fails loudly on real errors and produces complete `lib/esm/` + `lib/cjs/` output.
