const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Covers the require() path into @_linked/* subpaths. Do not add disableHierarchicalLookup:
// it breaks npm workspaces, which nest some dependencies (e.g. expo-asset under expo).
config.resolver.unstable_conditionNames = ['react-native', 'import', 'require'];

module.exports = config;
