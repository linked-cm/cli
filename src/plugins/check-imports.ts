// file: my-webpack-loader.js
const {getOptions} = require('loader-utils');
// const validateOptions = require('schema-utils');
const path = require('path');

// const schema = {
//   type: 'object',
//   properties: {
//     test: {
//       type: 'string',
//     },
//   },
// };
let tsconfig, baseUrl, outDir;
try {
  tsconfig = require(path.resolve(process.cwd(), './tsconfig.json'));
  baseUrl = path.resolve(process.cwd(), tsconfig.compilerOptions.baseUrl);
  outDir = tsconfig.compilerOptions.outDir;
} catch (err) {
  console.warn('Could not find tsconfig for checking imports');
}

export default function handler(source) {
  const options = getOptions(this);

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

  // console.log('-----');
  // for (let key in this) {
  //   console.log(key, this[key]);
  // }

  let isRelativeReq =
    request.indexOf('./') === 0 || request.indexOf('../') === 0;
  // if (isRelativeReq) {
  // console.log('rootContext', rootContext);
  // console.log('context', context);
  // console.log('request', request);
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
    this.resourcePath.indexOf(baseUrl) !== 0 &&
    this.resourcePath.indexOf('node_modules') === -1
  ) {
    this.emitError(
      Error(
        `LINCD Error: You are importing a file from outside the baseUrl ${tsconfig.compilerOptions.baseUrl}. 
        ${relativePath} is not in ${tsconfig.compilerOptions.baseUrl}.`,
      ),
    );
  }
  // if (this.resourcePath.indexOf(path.resolve('./src')) !== 0) {
  //   throw Error(`Reseource loading restricted for ${this.resourcePath}`);
  // }

  // validateOptions(schema, options, 'My Webpack Loader');

  return source;
}

module.exports = handler;
