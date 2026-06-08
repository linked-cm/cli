#!/usr/bin/env node
// Bootstrap entry for the `linked` bin. Registers Node module hooks at
// the top level, then dynamically imports the CLI so any TS/CSS that the
// CLI later loads from a user's app flows through these hooks.
//
// We use a custom ts-loader (based on esbuild) instead of `tsx` so we can
// force `experimentalDecorators: true` on the transform — @_linked/core
// ships legacy-signature property decorators and tsx/esbuild's default
// otherwise emits TC39 standard decorators, breaking property
// registration in user scripts.
import {register} from 'node:module';

register(new URL('./loaders/css-loader.mjs', import.meta.url));
register(new URL('./loaders/ts-loader.mjs', import.meta.url));

import('./cli.js').catch((err) => {
  console.error(err);
  process.exit(1);
});
