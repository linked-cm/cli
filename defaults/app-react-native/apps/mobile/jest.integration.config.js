// Integration tests against a real API and Fuseki: `npm run fuseki:up && npm run test:integration`.
// Same preset, transforms and module mapping as the unit config in package.json. jest-expo replaces the global
// fetch with a stubbed `expo/fetch` that never sends a request (it is not a jest mock), so the environment saves
// Node's fetch and restoreNodeFetch.ts reinstates it.
const { jest: unitConfig } = require('./package.json');

module.exports = {
  ...unitConfig,
  testMatch: ['<rootDir>/__tests__/integration/**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/'],
  testEnvironment: '<rootDir>/__tests__/integration/nodeFetchEnvironment.js',
  setupFilesAfterEnv: ['<rootDir>/__tests__/integration/restoreNodeFetch.ts'],
  globalSetup: '<rootDir>/__tests__/integration/globalSetup.ts',
  globalTeardown: '<rootDir>/__tests__/integration/globalTeardown.ts',
  testTimeout: 30000,
};
