import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hasS3Env } from '../src/fileStoreEnv.ts';

const all = {
  AWS_ACCESS_KEY_ID: 'key',
  AWS_SECRET_ACCESS_KEY: 'secret',
  AWS_REGION: 'us-east-1',
  S3_BUCKET_ENDPOINT: 'https://s3.example.com',
  S3_FILES_BUCKET_NAME: 'app-files',
};

test('false for an empty environment', () => {
  assert.equal(hasS3Env({}), false);
});

test('false when only S3_BUCKET_ENDPOINT is set', () => {
  assert.equal(hasS3Env({ S3_BUCKET_ENDPOINT: all.S3_BUCKET_ENDPOINT }), false);
});

test('false when a variable is empty', () => {
  assert.equal(hasS3Env({ ...all, AWS_REGION: '' }), false);
});

test('true when all five variables are set', () => {
  assert.equal(hasS3Env(all), true);
});
