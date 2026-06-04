---
'@_linked/cli': minor
---

Rename `LincdConfig` / `LincdWebpackConfig` / `LincdServerConfig` → `LinkedConfig` / `LinkedWebpackConfig` / `LinkedServerConfig`. Function `getLincdConfig` → `getLinkedConfig`. Legacy package.json flags `lincd: true` and `lincdApp: true` are no longer read — migrate to `linkedPackage: true` / `linkedApp: true`. Built loader registration is unaffected.

Plus: CLI command help text refresh (`LINCD app` → `Linked app`, etc.). Config file name `lincd.config.{js,json}` → `linked.config.{js,json}` (hard cut, no fallback) — was previously rolled out separately.
