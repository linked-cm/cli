---
'@_linked/cli': patch
---

Backend provider HMR reloads are now debounced and serialised.

`vite.watcher.on('change')` called `server.onSourceChange(pkg)` once per changed
file with no debounce and no queue. Since `onSourceChange` disposes a package's
providers and re-registers their Express routes, it mutates the shared router
stack — and a multi-file save, a format-on-save, or a branch switch ran several
of those dispose/re-register cycles concurrently against that same stack with
nothing ordering them.

Changed packages are now collected over a 150 ms window and their reload cycles
run one at a time on a promise chain. Reload failures are still logged per
package and no longer abort the cycles queued behind them.

No API change; dev-server behaviour only.
