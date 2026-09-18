// Quick tests for the `extensionlessImports` build step: adding `.js` to
// relative specifiers in emitted ESM, and where it sits in `linked build`.
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

  test('ignores .d.ts', async () => {
    write('shapes/Example.js');
    const declaration = "export * from './shapes/Example';\n";
    write('index.d.ts', declaration);
    expect((await rewriteExtensionlessImports(dir)).changed).toBe(0);
    expect(read('index.d.ts')).toBe(declaration);
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
  const names = (pkgJson: any) =>
    planBuildSteps(pkgJson, dir).map((step) => step.name);

  test('with extensionlessImports, skips the import check and rewrites ESM output', () => {
    const steps = names({linked: {extensionlessImports: true}});
    expect(steps).not.toContain('Checking imports');
    const esm = steps.indexOf('Compiling ESM');
    expect(esm).toBeGreaterThanOrEqual(0);
    expect(steps[esm + 1]).toBe('Rewriting ESM import specifiers');
  });

  const rewriteStep = () =>
    planBuildSteps({linked: {extensionlessImports: true}}, dir).find(
      (step) => step.name === 'Rewriting ESM import specifiers',
    )!;

  test('the rewrite step fails when lib/esm is missing', async () => {
    const result: any = await rewriteStep().apply();
    expect(result.error).toMatch(/lib\/esm was not emitted.*tsconfig-esm\.json/);
  });

  test('the rewrite step warns with the unresolved specifiers', async () => {
    fs.outputFileSync(path.join(dir, 'lib/esm/index.js'), "import './missing';\n");
    const result = await rewriteStep().apply();
    expect(typeof result).toBe('string');
    expect(result).toContain("'./missing' in index.js");
  });

  test('the rewrite step succeeds when everything resolves', async () => {
    fs.outputFileSync(path.join(dir, 'lib/esm/x.js'), 'export {};\n');
    fs.outputFileSync(path.join(dir, 'lib/esm/index.js'), "import './x';\n");
    expect(await rewriteStep().apply()).toBe(true);
  });

  test('without the field, the steps are unchanged', () => {
    for (const pkgJson of [{}, {linked: {extensionlessImports: false}}]) {
      expect(names(pkgJson)).toEqual([
        'Checking imports',
        'Compiling ESM',
        'Compiling CJS',
        'Copying files to lib folder',
        'Dual package support',
        'Removing old files from lib folder',
        'Checking dependencies',
      ]);
    }
  });
});
