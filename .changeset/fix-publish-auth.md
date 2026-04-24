---
'@_linked/cli': patch
---

Remove `prepack: yarn build && pinst --disable` and `postpack: pinst --enable` scripts. These were conflicting with the CI publish flow (ENEEDAUTH on the actual `npm publish` call). Build now happens only in the dedicated CI "Build" step. Also remove `postinstall: husky install` (not needed for published installs).
