---
"@_linked/cli": patch
---

Workspace-member clones (e.g. per-branch `apps/<app>/<branch>` checkouts with symlinked `@_linked/*` sources) now boot under `linked start`: their linked deps are excluded from Vite's dep optimizer so the workspace source resolver handles them, instead of esbuild failing to pre-bundle symlinked package subpaths (`No known conditions for ./shapes/SHACL`).
