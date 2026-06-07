---
"@_linked/cli": patch
---

Two install-time fixes:

- **Template `eslint-plugin-react-hooks` bumped to `latest`** (from `^4.6.0`). The old range maxed out at eslint 8, but `eslint: "latest"` resolves to 10, so a fresh `npm install` after `create-app` blew up with `ERESOLVE could not resolve peer eslint`. Yarn was permissive enough to silently accept the mismatch, which is how it slipped past create-app's install step.
- **Install spinner no longer swallows warnings.** Even on a 0-exit install, stderr (peer-dep warnings, deprecations, ERESOLVE warns) is now printed under the green checkmark. Silent installs hide real problems that bite users the moment they touch the lockfile.
