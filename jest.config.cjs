// Jest config for @_linked/cli unit tests.
//
// Tests target the compiled CJS output in lib/cjs, not raw src/. This avoids
// configuring jest's ESM mode (notoriously fiddly with our mixed tsx/ESM
// runtime) and keeps the test runner identical to what npm consumers see.
// Run `yarn build` before `yarn test:unit` so lib/cjs exists.
//
// E2E specs live in tests/e2e/ and run under Playwright (see
// playwright.config.ts), not Jest.
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/tests/unit'],
  testMatch: ['**/*.test.{ts,js}'],
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        configFile: false,
        babelrc: false,
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
