// Quick test for `create-app --template react-native` (plan 001a, D14a).
// Scaffolds the hand-made fixture template in tests/fixtures/ — no network.
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

// ora is ESM-only, which Jest's CommonJS loader cannot require.
jest.mock('ora', () => {
  const spinner = {start: () => spinner, succeed() {}, fail() {}};
  return {__esModule: true, default: () => spinner};
});

jest.mock('../../src/utils.js', () => {
  const actual = jest.requireActual('../../src/utils.js');
  return {...actual, execPromise: jest.fn(() => Promise.resolve(''))};
});

import {execPromise} from '../../src/utils.js';
import {
  createApp,
  reactNativeBundleId,
  reactNativeInternals,
  scaffoldReactNativeApp,
} from '../../src/cli-methods.js';

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'app-react-native-min');
const ID = {
  appName: 'Formae',
  appPrefix: 'formae',
  appDomain: 'formaestudios.com',
  hyphenName: 'formae',
};

const readJSON = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));

const findFiles = (dir: string, name: string): string[] =>
  fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findFiles(full, name);
    return entry.name === name ? [full] : [];
  });

const listFiles = (dir: string): string[] =>
  fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : listFiles(full);
    }
    return [full];
  });

const TEMPLATE = path.join(__dirname, '..', '..', 'defaults', 'app-react-native');

// Placeholder values the scaffold stamps (contract 3).
const PLACEHOLDERS = ['app-shapes', 'app-monorepo', 'App', 'app', 'com.example.app'];

// Leaf values of a JSON document, keyed by path, that contain a placeholder.
const placeholderLeaves = (value: any, prefix = ''): Record<string, string> => {
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce(
      (acc, [key, child]) => ({
        ...acc,
        // Keys can be placeholders too (dependency names).
        ...(key.includes('app-shapes') ? {[`${prefix}/${key}#key`]: key} : {}),
        ...placeholderLeaves(child, `${prefix}/${key}`),
      }),
      {},
    );
  }
  if (
    typeof value === 'string' &&
    (PLACEHOLDERS.includes(value) ||
      value.includes('app-shapes') ||
      value.includes('com.example.app'))
  ) {
    return {[prefix]: value};
  }
  return {};
};

let tmp: string;
let logSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'linked-rn-'));
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  (execPromise as jest.Mock).mockClear();
});

afterEach(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
  jest.restoreAllMocks();
  fs.removeSync(tmp);
});

describe('reactNativeBundleId', () => {
  test('reverses the domain and appends the prefix', () => {
    expect(reactNativeBundleId('formaestudios.com', 'formae')).toBe(
      'com.formaestudios.formae',
    );
  });

  test('normalises scheme, case and trailing slash', () => {
    expect(reactNativeBundleId('https://FormaeStudios.com/', 'formae')).toBe(
      'com.formaestudios.formae',
    );
  });

  test('keeps subdomains', () => {
    expect(reactNativeBundleId('app.formaestudios.com', 'formae')).toBe(
      'com.formaestudios.app.formae',
    );
  });

  test('replaces underscores, which a bundle ID does not allow', () => {
    expect(reactNativeBundleId('formaestudios.com', 'my_app')).toBe(
      'com.formaestudios.my-app',
    );
  });
});

describe('scaffoldReactNativeApp', () => {
  test('stamps identity into fixture', async () => {
    const target = path.join(tmp, 'formae');
    await scaffoldReactNativeApp(target, ID, {
      templateDir: FIXTURE,
      skipInstall: true,
    });

    expect(fs.existsSync(path.join(target, 'packages/formae-shapes'))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(target, 'packages/app-shapes'))).toBe(false);

    const rootPkg = readJSON(path.join(target, 'package.json'));
    expect(rootPkg.workspaces).toContain('packages/formae-shapes');
    expect(rootPkg.workspaces).not.toContain('packages/app-shapes');

    const gitignore = path.join(target, '.gitignore');
    expect(fs.existsSync(gitignore)).toBe(true);
    expect(fs.readFileSync(gitignore, 'utf8')).toContain(
      '!packages/formae-shapes/',
    );
    expect(findFiles(target, 'gitignore.template')).toEqual([]);
    expect(fs.existsSync(path.join(target, 'apps/mobile/.gitignore'))).toBe(
      true,
    );

    const shapesPkg = readJSON(
      path.join(target, 'packages/formae-shapes/package.json'),
    );
    expect(shapesPkg.name).toBe('formae-shapes');

    expect(
      fs.readFileSync(
        path.join(target, 'packages/formae-shapes/src/package.ts'),
        'utf8',
      ),
    ).toContain("linkedPackage('formae-shapes')");

    const mobilePkg = readJSON(path.join(target, 'apps/mobile/package.json'));
    expect(mobilePkg.dependencies['formae-shapes']).toBeDefined();
    expect(mobilePkg.dependencies['app-shapes']).toBeUndefined();
    expect(mobilePkg.jest.transformIgnorePatterns[0]).toContain(
      'formae-shapes',
    );

    const appJson = readJSON(path.join(target, 'apps/mobile/app.json'));
    expect(appJson.expo.name).toBe('Formae');
    expect(appJson.expo.slug).toBe('formae');
    expect(appJson.expo.ios.bundleIdentifier).toBe('com.formaestudios.formae');

    expect(
      fs.readFileSync(path.join(target, 'apps/mobile/App.tsx'), 'utf8'),
    ).toContain("import { Example } from 'formae-shapes';");

    expect(fs.existsSync(path.join(target, 'yarn.lock'))).toBe(false);
  });

  test('real template, no install', async () => {
    const target = path.join(tmp, 'formae');
    await scaffoldReactNativeApp(target, ID, {skipInstall: true});

    expect(fs.existsSync(path.join(target, 'packages/formae-shapes'))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(target, 'packages/app-shapes'))).toBe(false);

    const rootPkg = readJSON(path.join(target, 'package.json'));
    expect(rootPkg.name).toBe('formae-monorepo');
    expect(rootPkg.workspaces).toContain('packages/formae-shapes');
    expect(rootPkg.workspaces).not.toContain('packages/app-shapes');

    expect(fs.readFileSync(path.join(target, '.gitignore'), 'utf8')).toContain(
      '!packages/formae-shapes/',
    );
    expect(fs.existsSync(path.join(target, 'apps/mobile/.gitignore'))).toBe(
      true,
    );
    expect(findFiles(target, 'gitignore.template')).toEqual([]);

    expect(
      readJSON(path.join(target, 'packages/formae-shapes/package.json')).name,
    ).toBe('formae-shapes');
    expect(
      fs.readFileSync(
        path.join(target, 'packages/formae-shapes/src/package.ts'),
        'utf8',
      ),
    ).toContain("linkedPackage('formae-shapes')");

    const mobilePkg = readJSON(path.join(target, 'apps/mobile/package.json'));
    expect(mobilePkg.dependencies['formae-shapes']).toBeDefined();
    expect(mobilePkg.dependencies['app-shapes']).toBeUndefined();
    expect(mobilePkg.jest.transformIgnorePatterns[0]).toContain(
      'formae-shapes',
    );

    const appJson = readJSON(path.join(target, 'apps/mobile/app.json'));
    expect(appJson.expo.name).toBe('Formae');
    expect(appJson.expo.slug).toBe('formae');
    expect(appJson.expo.ios.bundleIdentifier).toBe('com.formaestudios.formae');

    for (const file of [
      'apps/mobile/src/shell/linkedDefaults.tsx',
      'apps/mobile/__tests__/shapes.test.ts',
      'apps/mobile/__tests__/linkedDefaults.test.tsx',
      'packages/formae-shapes/src/shapes/Example.ts',
    ]) {
      expect(fs.existsSync(path.join(target, file))).toBe(true);
    }
    expect(
      fs.readFileSync(path.join(target, 'apps/mobile/App.tsx'), 'utf8'),
    ).toContain("from 'formae-shapes'");

    // Regression guard: no file may still name the placeholder package.
    const stillNamed = listFiles(target).filter((file) => {
      const buffer = fs.readFileSync(file);
      return !buffer.includes(0) && buffer.toString('utf8').includes('app-shapes');
    });
    expect(stillNamed).toEqual([]);

    expect(findFiles(target, '.npmignore')).toEqual([]);
    expect(fs.existsSync(path.join(target, 'yarn.lock'))).toBe(false);
    expect(fs.existsSync(path.join(target, 'data'))).toBe(false);
  });

  test('leaves template literals alone', async () => {
    const template = path.join(tmp, 'template');
    fs.copySync(FIXTURE, template);
    const literal = 'const s = `${name}-${hyphen_name}`;\n';
    fs.writeFileSync(path.join(template, 'apps/mobile/literal.ts'), literal);

    const target = path.join(tmp, 'formae');
    await scaffoldReactNativeApp(target, ID, {
      templateDir: template,
      skipInstall: true,
    });

    expect(
      fs.readFileSync(path.join(target, 'apps/mobile/literal.ts'), 'utf8'),
    ).toBe(literal);
  });
});

describe('fixture and real template', () => {
  // The fixture stands in for defaults/app-react-native in the fast test; it
  // must not drift from the real template's placeholders.
  const fixtureFiles = listFiles(FIXTURE).map((f) => path.relative(FIXTURE, f));

  test('every fixture file exists in the real template', () => {
    const missing = fixtureFiles.filter(
      (rel) => !fs.existsSync(path.join(TEMPLATE, rel)),
    );
    expect(missing).toEqual([]);
  });

  test.each(fixtureFiles)('%s placeholders match the real template', (rel) => {
    const fixtureFile = path.join(FIXTURE, rel);
    const templateFile = path.join(TEMPLATE, rel);
    if (rel.endsWith('.json')) {
      const expected = placeholderLeaves(readJSON(fixtureFile));
      expect(Object.keys(expected).length).toBeGreaterThan(0);
      expect(placeholderLeaves(readJSON(templateFile))).toMatchObject(expected);
    } else {
      const templateLines = fs
        .readFileSync(templateFile, 'utf8')
        .split('\n')
        .map((l) => l.trim());
      const placeholderLines = fs
        .readFileSync(fixtureFile, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.includes('app-shapes'));
      for (const line of placeholderLines) {
        expect(templateLines).toContain(line);
      }
    }
  });
});

describe('createApp', () => {
  test('rejects unknown template', async () => {
    await createApp('x', tmp, {
      template: 'android' as any,
      appName: 'X',
      appPrefix: 'x',
      appDomain: 'x.com',
      skipInstall: true,
    });

    expect(fs.existsSync(path.join(tmp, 'x'))).toBe(false);
    expect(warnSpy.mock.calls.flat().join(' ')).toContain(
      'Unknown template "android". Use "web" or "react-native".',
    );
  });

  test('react-native path skips web post-steps', async () => {
    const scaffold = jest
      .spyOn(reactNativeInternals, 'scaffoldReactNativeApp')
      .mockResolvedValue(undefined);

    await createApp('x', tmp, {
      template: 'react-native',
      appName: 'X',
      appPrefix: 'x',
      appDomain: 'x.com',
      skipInstall: true,
    });

    expect(scaffold).toHaveBeenCalledTimes(1);
    expect(scaffold.mock.calls[0][1]).toMatchObject({hyphenName: 'x'});
    const commands = (execPromise as jest.Mock).mock.calls.map((c) => c[0]);
    expect(commands.some((c) => /git clone/.test(c))).toBe(false);
    expect(fs.existsSync(path.join(tmp, 'x', 'data'))).toBe(false);
  });
});
