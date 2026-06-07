---
'@_linked/cli': patch
---

`.npmignore` was excluding the starter template's `defaults/app-with-backend/src/` (and `scripts/`) because the `src` pattern matched **anywhere** in the tree, overriding the `!defaults/**/*` re-include. The published tarball was missing all the template's TypeScript source files, so `linked create-app` was producing apps without `src/`.

Anchor the cli's own-source ignore rules to the package root (`/src`, `/*.ts`, `/tsconfig.json`) and add an explicit `!defaults/**` re-include after.
