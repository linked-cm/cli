// Full test for `create-app --template react-native` (plan 001a, D14a).
//
// Scaffolds with the BUILT CLI, with install, into a temp directory, then proves
// the generated monorepo: one React, its own Jest suite, and a Metro iOS bundle.
// Needs network and takes several minutes. Gated by RUN_TEMPLATE_FULL=1 (set by
// `npm run test:template`) so it never runs by accident.
import {execFileSync, execSync} from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CLI = path.resolve(__dirname, '..', '..', 'lib', 'esm', 'launch.js');
const TEN_MINUTES = 10 * 60 * 1000;

const describeFull = process.env.RUN_TEMPLATE_FULL === '1' ? describe : describe.skip;

const run = (command: string, cwd: string) => {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 100 * 1024 * 1024,
      env: {...process.env, CI: '1', FORCE_COLOR: '0'},
    });
  } catch (err: any) {
    throw new Error(
      `\`${command}\` failed (exit ${err.status}):\n${err.stdout}\n${err.stderr}`,
    );
  }
};

describeFull('create-app --template react-native (full)', () => {
  let tmp: string;
  let app: string;

  beforeAll(() => {
    if (!fs.existsSync(CLI)) {
      throw new Error(`Built CLI not found at ${CLI}; run the build first.`);
    }
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'linked-rn-full-'));
    app = path.join(tmp, 'formae');
    execFileSync(
      process.execPath,
      [
        CLI,
        'create-app',
        'formae',
        '--template',
        'react-native',
        '--app-name',
        'Formae',
        '--app-prefix',
        'formae',
        '--app-domain',
        'formaestudios.com',
      ],
      {cwd: tmp, stdio: 'pipe', maxBuffer: 100 * 1024 * 1024},
    );
  }, TEN_MINUTES);

  afterAll(() => {
    if (tmp && process.env.KEEP_TEMPLATE_FULL !== '1') {
      fs.rmSync(tmp, {recursive: true, force: true});
    }
  });

  test('installs', () => {
    expect(fs.existsSync(path.join(app, 'node_modules'))).toBe(true);
    expect(fs.existsSync(path.join(app, 'package-lock.json'))).toBe(true);
    expect(fs.existsSync(path.join(app, 'yarn.lock'))).toBe(false);
  });

  test('npm ls react resolves exactly one React 19.2.3', () => {
    const out = run('npm ls react --all', app);
    const versions = new Set(
      // Bare `react@x`, not scoped names like `@_linked/react@x`.
      [...out.matchAll(/(?<![\w/@.-])react@(\d+\.\d+\.\d+)/g)].map((m) => m[1]),
    );
    expect([...versions]).toEqual(['19.2.3']);
  });

  test(
    'apps/mobile Jest suite passes',
    () => {
      // Jest reports its summary on stderr.
      const out = run('npm test -w apps/mobile 2>&1', app);
      expect(out).toMatch(/Tests:\s+7 passed, 7 total/);
    },
    TEN_MINUTES,
  );

  test(
    'expo export bundles for iOS',
    () => {
      const dist = path.join(tmp, 'dist');
      const out = run(
        `npx expo export --platform ios --output-dir "${dist}" 2>&1`,
        path.join(app, 'apps', 'mobile'),
      );
      expect(out).toMatch(/iOS Bundled/);
      expect(fs.existsSync(dist)).toBe(true);
    },
    TEN_MINUTES,
  );
});
