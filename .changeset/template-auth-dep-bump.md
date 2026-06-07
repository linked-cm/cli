---
'@_linked/cli': patch
---

Template's `@_linked/auth` dep range bumped from `~1.0` (which pinned to the broken 1.0.x empty-tarball releases) to `^1.1.0` (which has the actual `lib/`). Same for `@_linked/server-utils` (`^1.0.5` → `^1.0.6`) and `@_linked/schema` (`^1.0` → `^1.0.6` — both versions were empty before 1.0.6).

Also fixes `PersonPreview.tsx` template: `Person.update(...).for(source)` and `Person.delete(source)` now pass `{ id: source.id }` with an early-return guard, since `source.id` is optional on the shape type.
