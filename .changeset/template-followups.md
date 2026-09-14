---
'@_linked/cli': patch
---

React Native template: the integration test setup now tells apart "Docker is not installed", "Docker Compose is unavailable" and "Compose Fuseki is not running" (unit-tested in the scaffold); the integration Jest config comment says "Integration tests". README: document that `linked build` exits 1 whenever the build does not succeed (including in a `linkedApp` or a package without `linkedPackage: true`), and 0 with warnings. Reworded a stale migration comment in `linked start`.
