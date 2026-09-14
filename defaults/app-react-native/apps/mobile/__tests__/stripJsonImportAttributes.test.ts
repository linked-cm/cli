import { transformSync } from '@babel/core';

import stripJsonImportAttributes from '../babel/stripJsonImportAttributes';

const transform = (code: string, withPlugin = true, parserOpts: Record<string, unknown> = {}) =>
  transformSync(code, {
    babelrc: false,
    configFile: false,
    parserOpts,
    plugins: withPlugin ? [stripJsonImportAttributes] : [],
  })!.code;

// The plugin must produce exactly what Babel prints without it.
const expectUnchanged = (code: string) => expect(transform(code)).toBe(transform(code, false));

describe('stripJsonImportAttributes', () => {
  test('drops the options of a dynamic JSON import', () => {
    expect(transform("import('./a.json', { with: { type: 'json' } });")).toBe("import('./a.json');");
  });

  test('handles a template literal specifier', () => {
    expect(transform("import(`./a.json`, { with: { type: 'json' } });")).toBe('import(`./a.json`);');
  });

  test('handles ImportExpression nodes (createImportExpressions)', () => {
    const code = "import('./a.json', { with: { type: 'json' } });";
    expect(transform(code, true, { createImportExpressions: true })).toBe("import('./a.json');");
  });

  test('leaves a non-JSON dynamic import unchanged', () => {
    expectUnchanged("import('./a.js', { x: 1 });");
    expect(transform("import('./a.js', { x: 1 });")).toContain('x: 1');
  });

  test('leaves a non-literal specifier unchanged', () => {
    expectUnchanged("import(variable, { with: { type: 'json' } });");
    expect(transform("import(variable, { with: { type: 'json' } });")).toContain("type: 'json'");
  });

  test('leaves a static JSON import with attributes unchanged', () => {
    const code = "import d from './d.json' with { type: 'json' };";
    expectUnchanged(code);
    expect(transform(code)).toContain("with { type: 'json' }");
  });
});
