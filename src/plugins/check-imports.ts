import path from 'path';

// Lazily-loaded CJS deps. We deliberately avoid top-level `require(...)` so
// that native-ESM consumers (e.g. backend package indexing that does
// `import('@_linked/cli')`) do not crash with "require is not defined".
// `handler` is only ever invoked by webpack, which is a CJS environment, so
// the global `require` is available at call time.
let getOptions: ((ctx: unknown) => unknown) | undefined;
let tsconfig: {compilerOptions: {baseUrl: string; outDir?: string}} | undefined;
let baseUrl: string | undefined;
let outDir: string | undefined;

function ensureInitialized(): void {
  if (getOptions) return;
  // file: my-webpack-loader.js
  ({getOptions} = require('loader-utils'));
  // const validateOptions = require('schema-utils');

  // const schema = {
  //   type: 'object',
  //   properties: {
  //     test: {
  //       type: 'string',
  //     },
  //   },
  // };
  try {
    tsconfig = require(path.resolve(process.cwd(), './tsconfig.json'));
    baseUrl = path.resolve(process.cwd(), tsconfig!.compilerOptions.baseUrl);
    outDir = tsconfig!.compilerOptions.outDir;
  } catch (err) {
    console.warn('Could not find tsconfig for checking imports');
  }
}

function handler(this: any, source: string): string {
  ensureInitialized();

  const options = getOptions!(this);

  //e.g. lincd.org/modules/schema
  let rootContext = this.rootContext;
  //the folder, e.g. lincd.org/modules/schema/src/shapes
  let context = this._module.context;
  //the short raw request, e.g. ./shapes/Action
  let request = this._module.rawRequest;
  //full resolved path, e.g. /Users/you/web/lincd.org/modules/schema/src/shapes/Action.ts
  let userRequest = this._module.userRequest;
  //save as userRequest?
  let resource = this._module.resource;
  let relativePath = this._module.resourceResolveData.relativePath;

  console.log('-----');
  // for (let key in this) {
  //   console.log(key, this[key]);
  // }

  let isRelativeReq =
    request.indexOf('./') === 0 || request.indexOf('../') === 0;
  // if (isRelativeReq) {
  console.log('rootContext', rootContext);
  console.log('context', context);
  console.log('request', request);
  // // console.log('userRequest', userRequest);
  // // console.log('resource', resource);
  // console.log('relativePath', relativePath);
  // console.log(this.resourcePath);
  // // console.log(path.resolve(process.cwd(), baseUrl));
  // // }
  // console.log(isRelativeReq, this.resourcePath.indexOf(baseUrl) !== 0);

  //if its a relative import,and its not in the baseUrl, throw an error
  if (
    isRelativeReq &&
    baseUrl &&
    this.resourcePath.indexOf(baseUrl) !== 0 &&
    this.resourcePath.indexOf('node_modules') === -1
  ) {
    this.emitError(
      Error(
        `LINCD Error: You are importing a file from outside the baseUrl ${tsconfig!.compilerOptions.baseUrl}. 
        ${relativePath} is not in ${tsconfig!.compilerOptions.baseUrl}.`,
      ),
    );
  }
  // if (this.resourcePath.indexOf(path.resolve('./src')) !== 0) {
  //   throw Error(`Reseource loading restricted for ${this.resourcePath}`);
  // }

  // validateOptions(schema, options, 'My Webpack Loader');

  return source;
}

export default handler;

// Webpack loaders are consumed as CJS — webpack expects the loader to be
// `module.exports`. Set it only in CJS evaluation; in ESM, `module` is not a
// global and this branch is skipped, so it stays import-safe either way.
declare const module: any;
if (typeof module !== 'undefined' && module?.exports) {
  module.exports = handler;
  module.exports.default = handler;
}
