export {default as DeclarationPlugin} from './plugins/declaration-plugin';
export {default as externaliseModules} from './plugins/externalise-modules';
export {default as checkImports} from './plugins/check-imports';
// export {default as generateGruntConfig} from './config-grunt';
// export {buildMetadata} from './metadata';
import {generateWebpackConfig} from './config-webpack';

export {generateWebpackConfig};
export * from './utils';
