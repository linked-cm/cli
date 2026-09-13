// Jest transpiles src/ to CommonJS, where `import.meta` is a syntax error.
// Rewrite it to a CommonJS equivalent so modules like cli-methods.ts load.
module.exports = function importMetaToCommonJS({template}) {
  const build = template.expression.ast(
    "({url: require('url').pathToFileURL(__filename).href})",
  );
  return {
    visitor: {
      MetaProperty(path) {
        const {meta, property} = path.node;
        if (meta.name === 'import' && property.name === 'meta') {
          path.replaceWith(build);
        }
      },
    },
  };
};
