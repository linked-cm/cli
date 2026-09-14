// The react-native test environment (jest-environment-node) with Node's own fetch saved before any setup file
// runs. jest-expo's setup and `expo`'s winter runtime replace globalThis.fetch with `expo/fetch`, whose native
// module jest-expo stubs (it never sends a request). restoreNodeFetch.ts puts Node's fetch back.
const ReactNativeEnv = require('@react-native/jest-preset/jest/react-native-env.js');

const FETCH_GLOBALS = ['fetch', 'Headers', 'Request', 'Response', 'FormData'];

module.exports = class NodeFetchEnvironment extends ReactNativeEnv {
  constructor(config, context) {
    super(config, context);
    this.global.__NODE_FETCH_GLOBALS__ = Object.fromEntries(FETCH_GLOBALS.map((name) => [name, globalThis[name]]));
  }
};
