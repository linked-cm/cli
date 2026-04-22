#!/usr/bin/env tsx
if (!process.env.LINKED_SUPPRESS_DEPRECATION) {
  process.stderr.write(
    "\x1b[33m⚠️  'lincd' is deprecated and will be removed in a future release. Use 'linked' instead.\x1b[0m\n"
  );
  process.env.LINKED_SUPPRESS_DEPRECATION = '1';
}
import('./cli.js');
