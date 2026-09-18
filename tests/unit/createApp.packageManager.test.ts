// `create-app` scaffolds every app with npm — no yarn branch, no prompt.
// ora is ESM-only, which Jest's CommonJS loader cannot require.
jest.mock('ora', () => {
  const spinner = {start: () => spinner, succeed() {}, fail() {}};
  return {__esModule: true, default: () => spinner};
});

import {
  CREATE_APP_PACKAGE_MANAGER,
  installCommandFor,
  startCommandFor,
} from '../../src/cli-methods.js';

describe('create-app package manager', () => {
  test('scaffolds with npm', () => {
    expect(CREATE_APP_PACKAGE_MANAGER).toBe('npm');
  });

  test('the install command for the scaffolded app is a plain npm install', () => {
    const command = installCommandFor(CREATE_APP_PACKAGE_MANAGER);
    expect(command).toBe('npm install');
    expect(command).not.toMatch(/yarn/);
  });

  test('the next-steps command is npm start', () => {
    const command = startCommandFor(CREATE_APP_PACKAGE_MANAGER);
    expect(command).toBe('npm start');
    expect(command).not.toMatch(/yarn/);
  });

  test('the yarn commands stay available for callers that ask for them', () => {
    expect(installCommandFor('yarn')).toContain('yarn install');
    expect(startCommandFor('yarn')).toBe('yarn start');
  });
});
