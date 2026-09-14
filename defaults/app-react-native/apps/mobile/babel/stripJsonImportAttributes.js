/**
 * Babel plugin: drop import attributes from dynamic `import()` of JSON files.
 *
 * Linked ontology packages load their data with
 *   import('../data/x.json', { with: { type: 'json' } })
 * Node requires the attribute for JSON, so the packages keep it. Metro's dependency collector rejects any
 * `import()` with more than one argument ("Invalid call at line N"). This plugin removes the options argument
 * when the specifier is a static string ending in `.json`, so Metro bundles it as an ordinary async JSON module.
 * Everything else, including static `import x from './a.json' with { type: 'json' }`, is left untouched.
 */

function staticSpecifier(node) {
  if (!node) return null;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked;
  return null;
}

const isJson = (specifier) => typeof specifier === 'string' && /\.json$/i.test(specifier);

module.exports = function stripJsonImportAttributes() {
  return {
    name: 'strip-json-import-attributes',
    visitor: {
      // Default parser output (what Metro and babel-preset-expo use): `import(...)` is a CallExpression with an
      // `Import` callee.
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        if (callee.type !== 'Import' || args.length < 2) return;
        if (!isJson(staticSpecifier(args[0]))) return;
        path.node.arguments = [args[0]];
      },
      // With the parser option `createImportExpressions`, it is an ImportExpression with `source` and `options`.
      ImportExpression(path) {
        const { node } = path;
        if (!node.options || !isJson(staticSpecifier(node.source))) return;
        node.options = null;
      },
    },
  };
};
