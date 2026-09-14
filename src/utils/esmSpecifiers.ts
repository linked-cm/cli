import fs from 'fs-extra';
import {glob} from 'glob';
import path from 'path';
import ts from 'typescript';

// Specifiers Node already resolves as written.
const RESOLVED_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json']);

const isRelative = (spec: string) =>
  spec.startsWith('./') || spec.startsWith('../');

const isFile = (file: string) => {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
};

// Returns the rewritten specifier, the same specifier when it needs no change,
// or null when an extensionless specifier cannot be resolved.
const resolveSpecifier = (spec: string, fromDir: string): string | null => {
  if (!isRelative(spec) || RESOLVED_EXTENSIONS.has(path.extname(spec))) {
    return spec;
  }
  const target = path.resolve(fromDir, spec);
  if (isFile(target + '.js')) {
    return spec + '.js';
  }
  if (isFile(path.join(target, 'index.js'))) {
    return spec.replace(/\/$/, '') + '/index.js';
  }
  // Another existing file (e.g. './styles.css') is left as written.
  return isFile(target) ? spec : null;
};

// The string literals of static imports/exports (including side-effect
// imports) and of `import()` calls with a literal argument.
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
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

/** Appends `.js` (or `/index.js`) to extensionless relative specifiers in emitted ESM. Returns files changed. */
export async function rewriteExtensionlessImports(
  libEsmDir: string,
): Promise<number> {
  const files = await glob('**/*.js', {cwd: libEsmDir, absolute: true});
  let changed = 0;
  for (const file of files) {
    const text = await fs.readFile(file, 'utf8');
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    let output = text;
    // Apply edits back to front so earlier offsets stay valid.
    const literals = collectSpecifiers(source).reverse();
    for (const literal of literals) {
      const spec = literal.text;
      const rewritten = resolveSpecifier(spec, path.dirname(file));
      if (rewritten === null) {
        console.warn(
          `Could not resolve import '${spec}' in ${path.relative(libEsmDir, file)}; left unchanged`,
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
  }
  return changed;
}
