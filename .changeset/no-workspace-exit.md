---
"@_linked/cli": patch
---

`linked start` no longer aborts standalone (non-workspace) apps. `getLincdPackages()` used to print "Could not find package workspaces" and call `process.exit()` when no `workspaces` field was present in the nearest `package.json`. That broke `npm start` for every `npx @_linked/cli create-app …` scaffold, since the resulting app is a single-package repo with no workspaces.

It now returns `[]` in that case — there simply are no local workspace packages to scan, which is the correct answer for a standalone app. Monorepo behavior is unchanged.
