---
'@_linked/cli': patch
---

Relax `typescript` dep from `^5.7.3` to `^5.4.0` so consumers that pin a lower 5.x version (e.g. CN at 5.4.5) don't end up with a nested `typescript@5.9.x` install in `packages/cli/node_modules/`. The nested 5.9.x was incompatible with `react-refresh-typescript@2.0.12`'s AST walk — crashed frontend builds with `TypeError: Cannot read properties of undefined (reading 'declarations')` inside `VariableStatement.declarationList.declarations` traversal.
