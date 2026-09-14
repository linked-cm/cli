import type { ConfigContext, ExpoConfig } from 'expo/config';

// The API port the backend listens on (services/api/.env.example PORT). src/shell/env.ts combines it with the
// dev machine's host when EXPO_PUBLIC_API_URL is not set, so the Simulator and a device on the LAN both work.
const API_PORT = 4000;

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
