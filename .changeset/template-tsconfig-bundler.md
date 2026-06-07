---
"@_linked/cli": patch
---

Template `tsconfig.json` switched from `moduleResolution: "node"` to `moduleResolution: "bundler"`. The classic Node resolver doesn't honor the `exports` field in package.json, and `@_linked/react` (and friends) declare types only inside `exports[".".types]`, not as a top-level `types` field. The result was a fresh scaffold compiling cleanly with yarn install but exploding under webpack/ts-loader:

```
TS2307: Cannot find module '@_linked/react' or its corresponding type declarations.
  There are types at '.../node_modules/@_linked/react/lib/esm/index.d.ts', but
  this result could not be resolved under your current 'moduleResolution' setting.
  Consider updating to 'node16', 'nodenext', or 'bundler'.
```

`bundler` is the right choice for a webpack-bundled app — it honors `exports`, doesn't require `.js` extensions on relative imports, and doesn't enforce full ESM strictness.
