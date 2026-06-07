---
"@_linked/cli": minor
---

`create-app` now picks between npm and yarn deliberately instead of silently preferring yarn:

- If only one of `npm` / `yarn` is on `PATH`, that one is used.
- If both are installed AND the user is running interactively, `create-app` asks `Package manager [npm/yarn] (default: yarn):`. Empty answer keeps the old default (yarn). Typing `npm` or `yarn` overrides.
- If both are installed but flags (`--app-name` / `--app-prefix` / `--app-domain`) were passed, no prompt — yarn wins, matching the previous non-interactive default.
- The chosen package manager flows through the install step AND the final "next command" hint, so the copy-paste line at the end is always `cd my-app && npm start` or `cd my-app && yarn start` matching what was actually installed (instead of always showing `npm start` with a yarn comment).

Why this matters: scaffolding with yarn but then running `npm start` (without re-running `npm install`) used to leave critical packages unresolved at webpack-compile time. Picking one PM and reusing it removes that footgun.
