#!/usr/bin/env node
// Bootstrap entry for the `linked` / `lnk` bins. Registers Node module hooks
// (css-loader + tsx) at the top level, then dynamically imports the CLI so
// any TS/CSS that the CLI later loads from a user's app flows through these
// hooks. Replaces the previous template-side `node --import ./node_modules/...`
// pattern, which only worked when the loader file lived inside the calling
// app's own node_modules.
import {register} from 'node:module';
//@ts-ignore — tsx ships ESM-only types
import {register as tsx} from 'tsx/esm/api';

register(new URL('./loaders/css-loader.mjs', import.meta.url));
tsx();

import('./cli.js').catch((err) => {
  console.error(err);
  process.exit(1);
});
