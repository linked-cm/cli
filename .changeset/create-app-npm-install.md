---
'@_linked/cli': minor
---

`create-app` now scaffolds web apps with npm.

The web template used to install with yarn (and prompted for a package manager
when both were on PATH); it now always runs `npm install`, matching the
react-native template, and the next-steps message prints `npm start`. The empty
`yarn.lock` that create-app wrote to pin down Yarn's project-root search is no
longer created, so a new app has a single npm lockfile.
