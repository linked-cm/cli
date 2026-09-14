---
"@_linked/cli": patch
---

Publish only what the CLI needs at runtime: a `files` allowlist (`lib`, `defaults`, README, CHANGELOG, LICENSE) keeps test fixtures, Playwright `test-results/` and `package-lock.json` out of the tarball.

Fix `linked create-package` failing at its final step. With Yarn 2+ the new package was installed with Plug'n'Play (no `node_modules`), so `npm exec linked build` could not find the binary. Scaffolded packages now get `nodeLinker: node-modules` under Yarn 2+, the initial build runs through the CLI that is already executing, and a failed install or build sets a non-zero exit code.
