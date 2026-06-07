---
'@_linked/cli': minor
---

Template visual upgrade: animated background + primitives showcase.

**Animated background.** `App.module.css` now renders a fixed-position layer underneath all content with three soft radial-gradient blobs that drift and gently pulse on a 22s loop. Brand-colored via `--color-primary-300` / `--color-secondary-300` / `--color-tertiary-200`, so the look re-tints automatically when an app overrides theme tokens. Honors `prefers-reduced-motion: reduce`.

**Protected page** (`/page1`) reworked into a `@_linked/primitives` showcase, organized into `Tabs` (Forms / Display / Buttons). Exercises `Button` (variants, colors, sizes), `Input`, `Switch`, `Checkbox`, `RadioGroup`, `Slider`, `Progress`, `Avatar`, `Label`, `Separator` — useful both as a visual smoke-test of the active theme and as starter code showing how to reach for each primitive.

`@_linked/primitives` added as a template dep (`^1.0.6`).
