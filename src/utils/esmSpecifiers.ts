import fs from 'fs-extra';
import {glob} from 'glob';
import path from 'path';
import ts from 'typescript';

// Specifiers Node already resolves as written.
const RESOLVED_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json']);

const isRelative = (spec: string) =>
  spec === '.' ||
  spec === '..' ||
  spec.startsWith('./') ||
  spec.startsWith('../');

const isFile = (file: string) => {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
};

// A module exists at `<base>` when either the JS or its declaration is there:
// a declaration-only emit still resolves, and TypeScript's node16/nodenext
// resolution maps the `.js` specifier we write back onto the `.d.ts`.
const moduleExists = (
  base: string,
  {allowDeclarationOnly}: {allowDeclarationOnly: boolean},
) => isFile(base + '.js') || (allowDeclarationOnly && isFile(base + '.d.ts'));

// Returns the rewritten specifier, the same specifier when it needs no change,
// or null when an extensionless specifier cannot be resolved.
// `allowDeclarationOnly` is set while rewriting a `.d.ts`, where a sibling
// `.d.ts` with no `.js` (a types-only module) is a valid target.
const resolveSpecifier = (
  spec: string,
  fromDir: string,
  allowDeclarationOnly: boolean,
): string | null => {
  if (!isRelative(spec) || RESOLVED_EXTENSIONS.has(path.extname(spec))) {
    return spec;
  }
  // './dir/' -> './dir'. A trailing slash, like '.' and '..', explicitly names
  // a directory, so such a specifier must never resolve to a sibling '<x>.js'.
  const base = spec.replace(/\/+$/, '');
  const target = path.resolve(fromDir, base);
  const namesDirectory = base !== spec || /(^|\/)\.\.?$/.test(base);
  const options = {allowDeclarationOnly};
  // A file wins over a directory of the same name: Node's own resolution of
  // './x' inside an ESM package likewise never falls back to './x/index.js',
  // and tsc emits './x' for a source file './x.ts' sitting next to an './x/'.
  if (!namesDirectory && moduleExists(target, options)) {
    return base + '.js';
  }
  if (moduleExists(path.join(target, 'index'), options)) {
    return base + '/index.js';
  }
  // Another existing file (e.g. './styles.css') is left as written.
  return isFile(target) ? spec : null;
};

// The string literals of static imports/exports (including side-effect
// imports), of `import()` calls with a literal argument, and — in declarations —
// of `import('./x')` types. Nested nodes are visited, so imports and exports
// inside a `declare module` body are covered as well.
// A template literal with substitutions — `import(`./${name}`)` — is not a
// literal specifier and is deliberately skipped: its target is only known at
// runtime, so it is neither rewritten nor reported as unresolved.
const collectSpecifiers = (source: ts.SourceFile): ts.StringLiteral[] => {
  const found: ts.StringLiteral[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      found.push(node.moduleSpecifier);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      found.push(node.arguments[0] as ts.StringLiteral);
    } else if (
      // `type A = import('./x').B` and the same in `typeof import('./x')`.
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      found.push(node.argument.literal);
    } else if (
      // `import x = require('./y')`, which node16 declarations still emit.
      ts.isExternalModuleReference(node) &&
      ts.isStringLiteral(node.expression)
    ) {
      found.push(node.expression);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

export type RewriteResult = {
  /** Number of files rewritten. */
  changed: number;
  /** Specifiers left as written because no file matched, as `'<spec>' in <file>`. */
  unresolved: string[];
};

/**
 * Appends `.js` (or `/index.js`) to extensionless relative specifiers in emitted
 * ESM — in `.js` and in the `.d.ts` declarations beside them, so consumers on
 * TypeScript `node16`/`nodenext` resolution get valid declarations too.
 */
export async function rewriteExtensionlessImports(
  libEsmDir: string,
): Promise<RewriteResult> {
  const files = (
    await glob('**/*.{js,d.ts}', {cwd: libEsmDir, absolute: true})
  ).sort();
  let changed = 0;
  const unresolved: string[] = [];
  for (const file of files) {
    const isDeclaration = file.endsWith('.d.ts');
    const text = await fs.readFile(file, 'utf8');
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      isDeclaration ? ts.ScriptKind.TS : ts.ScriptKind.JS,
    );
    let output = text;
    // Apply edits back to front so earlier offsets stay valid.
    const literals = collectSpecifiers(source).reverse();
    const fileUnresolved: string[] = [];
    for (const literal of literals) {
      const spec = literal.text;
      const rewritten = resolveSpecifier(
        spec,
        path.dirname(file),
        isDeclaration,
      );
      if (rewritten === null) {
        fileUnresolved.unshift(
          `'${spec}' in ${path.relative(libEsmDir, file)}`,
        );
        continue;
      }
      if (rewritten !== spec) {
        // Keep the original quotes; replace only the text between them.
        const start = literal.getStart(source) + 1;
        const end = literal.getEnd() - 1;
        output = output.slice(0, start) + rewritten + output.slice(end);
      }
    }
    if (output !== text) {
      await fs.writeFile(file, output);
      changed++;
    }
    unresolved.push(...fileUnresolved);
  }
  return {changed, unresolved};
}
