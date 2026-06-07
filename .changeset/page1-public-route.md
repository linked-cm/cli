---
'@_linked/cli': patch
---

The components-showcase page (`/page1`) is now a public route by default — the template doesn't wire up an authentication provider out of the box, so `requireAuth` would just hide the page behind a redirect to a non-functional signin. The `requireAuth: true` line is now commented out with a note pointing readers to `@_linked/auth` when they want to add it.

Top-of-file comment in `Page1.tsx` updated to match.
