---
'@_linked/cli': patch
---

`linked start --vite`: widen development config discovery so apps that predate
the current filenames still start.

- The app's linked config is now looked up as `linked.config.js` **or** the
  legacy `lincd.config.js` (current name wins when both exist). Apps that never
  renamed the file silently lost their whole `server` block — `cachePaths`,
  `apiOnly` and the rest of LinkedServer's options — because only the new name
  was read. The lookup is exposed as `resolveLinkedConfigPath()`.
- SSR page discovery also skips `*.d.ts` files in `src/pages/` (alongside the
  existing `.test` / `.spec` skip). Type declarations have no runtime module,
  so preloading them into the SSR graph only produced errors.
- The backend storage config is discovered under several legacy filenames
  (`backend-storage-config.*`, `scripts/backend-storage-config.*`,
  `scripts/storage-config.js`) in addition to `linked.backend.storage.*`.
