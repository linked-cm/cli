---
"@_linked/cli": patch
---

`linked create-app` now stamps the chosen app identity into the scaffolded app. The app template ships without `${var}` scaffold placeholders (so a raw clone boots on defaults), so create-app writes the real per-app values after cloning: `.env`/`.env.example` (`APP_NAME`, `APP_PREFIX`), `package.json` `name`/`displayName`, the runtime `linkedPackage(...)` id in `src/package.ts`, and the pm2 / VS Code launch names. Both the `--app-name` flag and the interactive prompt now produce an app that carries the chosen name (previously every scaffolded app inherited the template defaults).
