---
'@_linked/cli': patch
---

CLI sub-template imports updated to use `@_linked/core` instead of legacy
`lincd/...`:

- `defaults/shape.ts` — `Shape` + `NamedNode` from `@_linked/core`
- `defaults/package/src/package.ts` — `linkedPackage` from `@_linked/core/utils/Package` (clean 1:1 swap; `@_linked/core` exports it identically)
- `defaults/package/src/ontologies/example-ontology.ts` — `NamedNode` + `createNameSpace` from `@_linked/core` (unused `lincd-jsonld` import dropped)

**Important caveat — TODO comments inline in the template files explain**:
the `package.ts` template is a clean working swap. The `shape.ts` and
`ontologies/example-ontology.ts` templates' generated output **will fail
to compile** because `@_linked/core` doesn't export `NamedNode` or
`Literal` as runtime classes — the new framework architecture moved past
direct node construction. Templates need a rewrite to emit the modern
getter-only `@_linked/*` shape pattern (see `@_linked/schema/shapes/Person.ts`).
The import-path change is a deliberate signal-of-intent that lands
incomplete; the actual template rewrite is tracked as downstream
Shape-Builder / Ontology-Manager review work.

Users of `linked create shape Foo` and `linked create package Bar`: if you
hit "Cannot find name NamedNode" or "Cannot find name Literal" errors
in scaffolded files, you've hit the documented gap. The fix path is the
template rewrite, not reverting to legacy lincd.

Context: see create-now plan-011 report (docs/reports/009-legacy-lincd-eradication.md).
