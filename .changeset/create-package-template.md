---
'@_linked/cli': patch
---

Make `linked create-package` produce a package that builds.

Four things stopped it, none of which the scaffolded output survived:

- The final step ran `npm exec lincd build`. `lincd` is the **old** CLI's binary, and its
  compiled output imports `lincd/lib/esm/utils/LinkedFileStorage.js`, which the current
  workspace does not ship. The result was `Could not install dependencies` and no build.
  It now runs `linked build`.
- The template's `src/package.ts` destructured `linkedComponent` from `linkedPackage()`.
  That is not part of core's `LinkedPackageObject` — component binding lives in
  `@_linked/react` — so every new package failed to compile on its own boilerplate.
- The ontology template imported `NamedNode` from bare `@_linked/core`. The symbol no
  longer exists there, and the bare specifier cannot resolve under the template's
  `moduleResolution: "node"` anyway. It now uses `NodeReferenceValue`, matching how the
  framework's own ontologies are written.
- `src/index.ts` had `import './types'` with no extension, which the CLI's own import check
  rejects.

Verified by scaffolding a package and building it: ESM, CJS, dual-package output, import
check and dependency check all pass with no edits.
