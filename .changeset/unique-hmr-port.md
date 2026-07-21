---
'@_linked/cli': patch
---

`createViteConfig`: give each app a unique HMR websocket port, derived from its
dev port (`PORT` env override, else `opts.port`), instead of Vite's shared
default `24678`.

Every app built on `createViteConfig` defaulted to `24678` for HMR, so running
two of them at once (parallel worktrees / multiple `@_linked` apps on one
machine) collided — `WebSocket server error: Port 24678 is already in use`, and
HMR silently broke for the loser. The port is now `24678 + (devPort - 4040)`, so
apps that already use distinct dev ports get distinct HMR ports for free. Apps
can still override via `server.hmr` in their own merged config.
