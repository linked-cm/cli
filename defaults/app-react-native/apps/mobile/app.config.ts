import type { ConfigContext, ExpoConfig } from 'expo/config';

// The default API port lives in src/shell/apiPort.json (services/api/.env.example PORT), shared with env.ts. JSON,
// because Expo's config loader cannot import a TypeScript module.
import { defaultApiPort } from './src/shell/apiPort.json';

// src/shell/env.ts combines the API port with the dev machine's host when EXPO_PUBLIC_API_URL is not set, so the
// Simulator and a device on the LAN both work.
const API_PORT = defaultApiPort;

// The static app identity (name, slug, bundle identifier) stays in app.json; Expo passes it in as `config`.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'App',
  slug: config.slug ?? 'app',
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? null,
    apiPort: API_PORT,
  },
});
