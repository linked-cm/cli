// Resolves the API URL and exposes it to @_linked/server's BackendAPIStore, which reads process.env.SITE_ROOT and
// DATA_ROOT at runtime. App.tsx imports this module first, before any Linked import.
import Constants from 'expo-constants';

export type ApiUrlInput = {
  extra?: { apiUrl?: string | null; apiPort?: number } | null;
  hostUri?: string | null;
};

const DEFAULT_API_PORT = 4000;

/**
 * `extra.apiUrl` (EXPO_PUBLIC_API_URL) if set; otherwise the dev machine's host from Expo's `hostUri`
 * (`192.168.1.5:8081`) with the API port; otherwise localhost.
 */
export function resolveApiUrl({ extra, hostUri }: ApiUrlInput): string {
  if (extra?.apiUrl) return extra.apiUrl;
  const port = extra?.apiPort ?? DEFAULT_API_PORT;
  const host = hostUri ? hostUri.split(':')[0] : '';
  return `http://${host || 'localhost'}:${port}`;
}

export const apiUrl: string = resolveApiUrl({
  extra: Constants.expoConfig?.extra as ApiUrlInput['extra'],
  hostUri: Constants.expoConfig?.hostUri,
});

process.env.SITE_ROOT = apiUrl;
process.env.DATA_ROOT = `${apiUrl}/data`;
