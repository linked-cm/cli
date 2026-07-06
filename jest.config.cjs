// Jest config for @_linked/cli unit tests.
//
// The cli is now ESM-only (no lib/cjs). Rather than configure jest's ESM mode
// (notoriously fiddly), tests import raw `src/` .ts and let babel-jest
// transpile ESM→CJS. The `moduleNameMapper` below strips the `.js` suffix from
// relative specifiers (src uses the published-output `./foo.js` convention) so
// they resolve back to the `.ts` source.
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
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
