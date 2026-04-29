---
'@_linked/cli': patch
---

Remove `preflight.css` — moved to `@_linked/css`.

`preflight.css` is a CSS asset; it belongs in the CSS package alongside `theme-defaults.css` and `utilities.css`. Consumers should update imports from `@_linked/cli/preflight.css` to `@_linked/css/preflight.css`.

The exports entry `"./preflight.css": "./preflight.css"` is also removed from `package.json`.
