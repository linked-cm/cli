---
"@_linked/cli": patch
---

Stripped `@_linked/auth` from the default scaffold. It was wired in (`<ProvideAuth>` in `App.tsx`, `RequireAuth` import in `routes.tsx`) but no signin provider was configured, so it did nothing — while still dragging the entire legacy `lincd-*` chain (`foaf`, `lincd-input`, `lincd-mui-base`, `lincd-rdfs`, `lincd-sioc`) into the dep tree and crashing on startup with `Error: Multiple versions of LINCD are loaded` (both `lincd@1.0.3` and `@_linked/core` claim the same `globalThis.lincd` key).

To add sign-in back: `yarn add @_linked/auth`, wrap `<AppRoutes/>` in `<ProvideAuth>`, import `RequireAuth`, set `requireAuth: true` on the route you want protected. Inline comments in `App.tsx` and `routes.tsx` show where.
