// Pure environment check, kept free of Linked imports so `node --test` can load it without Vite.

export const S3_ENV_KEYS = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'S3_BUCKET_ENDPOINT',
  'S3_FILES_BUCKET_NAME',
] as const;

/** True when every S3 variable is set and non-empty: the API then stores files in S3 (or an S3-compatible service). */
export function hasS3Env(env: Record<string, string | undefined>): boolean {
  return S3_ENV_KEYS.every((key) => Boolean(env[key]));
}
