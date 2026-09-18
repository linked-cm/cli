// Tests for the unconditional ESM-specifier rewrite: adding `.js` to relative
// specifiers in emitted ESM (JS and declarations), and where it sits in
// `linked build`.
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

// ora is ESM-only, which Jest's CommonJS loader cannot require.
jest.mock('ora', () => ({__esModule: true, default: () => ({})}));

import {planBuildSteps} from '../../src/cli-methods.js';
import {rewriteExtensionlessImports} from '../../src/utils/esmSpecifiers.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'linked-esm-'));
});

afterEach(() => {
  fs.removeSync(dir);
  jest.restoreAllMocks();
});

const write = (file: string, content = 'export {};\n') => {
  fs.outputFileSync(path.join(dir, file), content);
};
const read = (file: string) => fs.readFileSync(path.join(dir, file), 'utf8');

describe('rewriteExtensionlessImports', () => {
  test('rewrites file import', async () => {
    write('shapes/Example.js');
    write('index.js', "import {A} from './shapes/Example';\n");
    expect((await rewriteExtensionlessImports(dir)).changed).toBe(1);
    expect(read('index.js')).toBe("import {A} from './shapes/Example.js';\n");
  });

  test('rewrites directory import', async () => {
    write('shapes/index.js');
    write('index.js', "export * from './shapes';\n");
    expect((await rewriteExtensionlessImports(dir)).changed).toBe(1);
    expect(read('index.js')).toBe("export * from './shapes/index.js';\n");
  });

  test('rewrites dynamic import', async () => {
    write('x.js');
    write('index.js', "const m = import('./x');\n");
    expect((await rewriteExtensionlessImports(dir)).changed).toBe(1);
    expect(read('index.js')).toBe("const m = import('./x.js');\n");
  });

  test('rewrites side-effect import and parent-relative specifiers', async () => {
    write('package.js');
    write('shapes/Example.js', 'import "../package";\n');
    expect((await rewriteExtensionlessImports(dir)).changed).toBe(1);
    expect(read('shapes/Example.js')).toBe('import "../package.js";\n');
  });

  test('leaves extensioned, bare and json specifiers', async () => {
    write('a.js');
    write('d.json', '{}');
    const source =
      "import './a.js';\nimport {Shape} from '@_linked/core';\nimport d from './d.json';\n";
    write('index.js', source);
    expect((await rewriteExtensionlessImports(dir)).changed).toBe(0);
    expect(read('index.js')).toBe(source);
  });

  test('leaves unresolvable and reports them', async () => {
    write('b.js');
    write('index.js', "import './missing';\nimport './b';\n");
    write('other.js', "import './missing';\n");
    const result = await rewriteExtensionlessImports(dir);
    expect(result.changed).toBe(1);
    expect(read('index.js')).toBe("import './missing';\nimport './b.js';\n");
    expect(read('other.js')).toBe("import './missing';\n");
    expect(result.unresolved).toEqual(["'./missing' in index.js", "'./missing' in other.js"]);
  });

  test("'.' and '..' resolve to index.js", async () => {
    write('index.js');
    write('sub/index.js', "export * from '.';\nimport '..';\n");
    const result = await rewriteExtensionlessImports(dir);
    expect(result.unresolved).toEqual([]);
    expect(read('sub/index.js')).toBe("export * from './index.js';\nimport '../index.js';\n");
  });

  test("'./dir/' strips the trailing slash and never yields './dir/.js'", async () => {
    write('dir/index.js');
    write('file.js');
    write('index.js', "import './dir/';\nimport './file/';\n");
    await rewriteExtensionlessImports(dir);
    expect(read('index.js')).toBe("import './dir/index.js';\nimport './file.js';\n");
  });

  test('rewrites export * as namespace', async () => {
    write('x.js');
    write('index.js', "export * as ns from './x';\n");
    await rewriteExtensionlessImports(dir);
    expect(read('index.js')).toBe("export * as ns from './x.js';\n");
  });

  test('leaves strings and comments that look like imports', async () => {
    write('x.js');
    const source =
      "// import {a} from './x';\n/* export * from './x'; */\nconst s = \"import './x'\";\nconst t = `from './x'`;\n";
    write('index.js', source);
    const result = await rewriteExtensionlessImports(dir);
    expect(result).toEqual({changed: 0, unresolved: []});
    expect(read('index.js')).toBe(source);
  });

  test('rewrites .d.ts alongside .js', async () => {
    write('shapes/Example.js');
    write('shapes/Example.d.ts');
    write('index.js', "export * from './shapes/Example';\n");
    write('index.d.ts', "export * from './shapes/Example';\n");
    expect((await rewriteExtensionlessImports(dir)).changed).toBe(2);
    expect(read('index.d.ts')).toBe("export * from './shapes/Example.js';\n");
    expect(read('index.js')).toBe("export * from './shapes/Example.js';\n");
  });

  test('rewrites import/export/import() type positions in a .d.ts', async () => {
    write('a.js');
    write('a.d.ts');
    write('b/index.js');
    write('b/index.d.ts');
    write(
      'index.d.ts',
      [
        "import type {A} from './a';",
        "export {B} from './b';",
        "export declare const c: import('./a').A;",
        "export declare const d: typeof import('./b');",
        '',
      ].join('\n'),
    );
    expect((await rewriteExtensionlessImports(dir)).changed).toBe(1);
    expect(read('index.d.ts')).toBe(
      [
        "import type {A} from './a.js';",
        "export {B} from './b/index.js';",
        "export declare const c: import('./a.js').A;",
        "export declare const d: typeof import('./b/index.js');",
        '',
      ].join('\n'),
    );
  });

  test('rewrites imports inside a declare module body', async () => {
    write('a.js');
    write('a.d.ts');
    write(
      'index.d.ts',
      "declare module 'ext' {\n  import {A} from './a';\n  export {A};\n}\n",
    );
    expect((await rewriteExtensionlessImports(dir)).changed).toBe(1);
    expect(read('index.d.ts')).toContain("from './a.js'");
  });

  test('a declaration may target a types-only module, JS may not', async () => {
    write('types.d.ts');
    write('index.d.ts', "export type {T} from './types';\n");
    write('index.js', "export * from './types';\n");
    const result = await rewriteExtensionlessImports(dir);
    expect(read('index.d.ts')).toBe("export type {T} from './types.js';\n");
    expect(read('index.js')).toBe("export * from './types';\n");
    expect(result.unresolved).toEqual(["'./types' in index.js"]);
  });

  test('a package that already writes .js specifiers is untouched', async () => {
    write('shapes/Example.js');
    write('shapes/Example.d.ts');
    const js = "export * from './shapes/Example.js';\n";
    const dts = "export * from './shapes/Example.js';\n";
    write('index.js', js);
    write('index.d.ts', dts);
    expect(await rewriteExtensionlessImports(dir)).toEqual({
      changed: 0,
      unresolved: [],
    });
    expect(read('index.js')).toBe(js);
    expect(read('index.d.ts')).toBe(dts);
  });

  test('idempotent', async () => {
    write('shapes/index.js', "export * from './Example';\n");
    write('shapes/Example.js');
    write('index.js', "export * from './shapes';\n");
    expect((await rewriteExtensionlessImports(dir)).changed).toBe(2);
    expect((await rewriteExtensionlessImports(dir)).changed).toBe(0);
  });
});

describe('planBuildSteps', () => {
  const names = (pkgJson: any = {}) =>
    planBuildSteps(pkgJson, dir).map((step) => step.name);

  const withEsmConfig = () =>
    fs.outputFileSync(path.join(dir, 'tsconfig-esm.json'), '{}');

  test('every package checks imports and then rewrites the ESM output', () => {
    expect(names()).toEqual([
      'Checking imports',
      'Compiling ESM',
      'Rewriting ESM import specifiers',
      'Compiling CJS',
      'Copying files to lib folder',
      'Dual package support',
      'Removing old files from lib folder',
      'Checking dependencies',
    ]);
  });

  const rewriteStep = () =>
    planBuildSteps({}, dir).find(
      (step) => step.name === 'Rewriting ESM import specifiers',
    )!;

  test('the rewrite step fails when lib/esm is missing', async () => {
    withEsmConfig();
    const result: any = await rewriteStep().apply();
    expect(result.error).toMatch(/lib\/esm was not emitted/);
  });

  test('a package with no ESM build skips the rewrite instead of failing', async () => {
    // No tsconfig-esm.json, so the ESM compile was skipped too.
    expect(fs.existsSync(path.join(dir, 'tsconfig-esm.json'))).toBe(false);
    expect(await rewriteStep().apply()).toBe(true);
  });

  test('the rewrite step warns with the unresolved specifiers', async () => {
    withEsmConfig();
    fs.outputFileSync(path.join(dir, 'lib/esm/index.js'), "import './missing';\n");
    const result = await rewriteStep().apply();
    expect(typeof result).toBe('string');
    expect(result).toContain("'./missing' in index.js");
  });

  test('the rewrite step succeeds when everything resolves', async () => {
    withEsmConfig();
    fs.outputFileSync(path.join(dir, 'lib/esm/x.js'), 'export {};\n');
    fs.outputFileSync(path.join(dir, 'lib/esm/index.js'), "import './x';\n");
    expect(await rewriteStep().apply()).toBe(true);
  });
});

describe('checkImports', () => {
  const src = () => path.join(dir, 'src');
  const writeSrc = (file: string, content: string) =>
    fs.outputFileSync(path.join(src(), file), content);

  const check = () =>
    planBuildSteps({}, dir)
      .find((step) => step.name === 'Checking imports')!
      .apply();

  test('extensionless relative imports are allowed', async () => {
    writeSrc('index.ts', "import {Example} from './shapes/Example';\n");
    writeSrc('shapes/Example.ts', 'export class Example {}\n');
    await expect(check()).resolves.not.toBe(false);
  });

  test('importing from outside the package fails the build', async () => {
    writeSrc('index.ts', "import {Thing} from '../../elsewhere/Thing.js';\n");
    await expect(check()).rejects.toContain('outside the package source root');
  });

  test('importing another package through /src/ fails the build', async () => {
    writeSrc('index.ts', "import {Thing} from 'lincd-foo/src/Thing.js';\n");
    await expect(check()).rejects.toContain('/src/ or /lib/');
  });
});
