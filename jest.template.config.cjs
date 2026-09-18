// Jest config for the React Native template full test (plan 001a, D14a).
//
// Kept separate from jest.config.cjs so the quick unit gate stays offline: this
// suite scaffolds with the BUILT CLI (lib/esm/launch.js), runs `npm install`
// against the registry, then Jest and an iOS export inside the generated app.
// Run it with `npm run test:template` after building.
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/tests/template'],
  testMatch: ['**/*.test.{ts,js}'],
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        configFile: false,
        babelrc: false,
        presets: [
          ['@babel/preset-env', {targets: {node: 'current'}}],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 10 * 60 * 1000,
};
