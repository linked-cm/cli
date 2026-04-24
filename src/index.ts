export {default as DeclarationPlugin} from './plugins/declaration-plugin';
export {default as externaliseModules} from './plugins/externalise-modules';
// './plugins/check-imports' is a webpack loader (CJS, uses require()). It must
// NOT be re-exported here — importing the @_linked/cli barrel would force it
// to evaluate in ESM context and crash. Webpack loads it via file path in
// config-webpack.ts.
export {default as tailwindConfig} from './tailwind.config';
// export {buildMetadata} from './metadata';
import {generateWebpackConfig} from './config-webpack';

export {generateWebpackConfig};
export * from './utils';
export {defineConfig} from './defineConfig';
export type {
  LincdConfig,
  LincdWebpackConfig,
  LincdServerConfig,
} from './interfaces';

export {buildPackageByPath} from './commands/build-package';
export {safeYarn} from './commands/safe-yarn';
export {setupPublish} from './commands/setup-publish';
