# Linked React Native monorepo

An npm-workspaces monorepo for a [Linked](https://github.com/linked-cm) app on Expo SDK 57 / React Native 0.86 /
React 19.2.

```
apps/mobile/          Expo app (continuous native generation: ios/ is generated, not committed)
  src/shell/          app shell, including the React Native render defaults for @_linked/react
  __tests__/          shape registration and render-default tests
packages/app-shapes/  Linked shapes package, consumed as TypeScript source (no build step)
services/api/         backend stub
```

## Run

```bash
npm install
npm test -w apps/mobile          # Jest
cd apps/mobile && npx expo run:ios   # generates ios/, builds the dev client, starts Metro
```

Requires Node `^22.13 || >=24`. iOS builds need macOS 26.2+ and Xcode 26.4+ with the iOS platform component
installed.

## Quick checks

| Command | What it proves |
|---|---|
| `npm ls react` (root) | exactly one React 19.2.3 in the tree |
| `npm test -w apps/mobile` | shapes register at runtime; Linked components render React Native elements while loading and on error |
| `cd apps/mobile && npx expo export --platform ios --output-dir /tmp/export` | Metro resolves `@_linked/*` (including subpaths) and the workspace packages |

## React Native specifics

- **One React.** `@_linked/react` still declares a React 18 peer, so the root `package.json` `overrides` pins its
  `react` to 19.2.3. Remove the override once the peer range is widened upstream. Do not use
  `--legacy-peer-deps`: it would hide a duplicate React.
- **Workspaces are enumerated**, never globbed, so foreign repositories checked out under `packages/` are not
  adopted. `.gitignore` uses `packages/*` plus a negation per workspace package (`packages/` cannot be negated).
- **Metro** (`apps/mobile/metro.config.js`) watches the workspace root and searches both `node_modules`
  directories. It deliberately does **not** set `disableHierarchicalLookup`, which breaks npm's nested
  dependencies (e.g. `expo-asset` under `expo`). `unstable_conditionNames` covers `require()` of `@_linked/*`
  subpaths.
- **Jest** maps `@_linked/*` to its ESM build with a scoped `moduleNameMapper`. A global
  `customExportConditions` would break `@babel/runtime`. Add every workspace package to
  `transformIgnorePatterns`.
- **Render defaults.** `@_linked/react`'s built-in loader and error elements are `<svg>`, which crash on React
  Native. `apps/mobile/src/shell/linkedDefaults.tsx` replaces them app-wide and must be the first import of
  `App.tsx`. `__tests__/linkedDefaults.test.tsx` fails if the defaults are not applied.
- **Shapes package imports are extensionless** (`./shapes/Example`, not `./shapes/Example.js`): Metro does not
  map `.js` specifiers to `.ts` source. For the same reason the package is never built with `linked build`,
  whose import check rejects extensionless imports.
- **Decorators** work with the stock `babel-preset-expo`; no extra Babel plugin is needed.
