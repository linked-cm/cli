import path from 'path';
import chalk from 'chalk';
import ReactRefreshTypeScript from 'react-refresh-typescript';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import webpack from 'webpack';
import fs from 'fs';
import {BundleAnalyzerPlugin} from 'webpack-bundle-analyzer';
import TerserPlugin from 'terser-webpack-plugin';
import {findNearestPackageJsonSync} from 'find-nearest-package-json';
import {getLINCDDependencies, getLinkedTailwindColors} from './utils';

import tailwindPlugin from 'tailwindcss/plugin';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'),
);

// Can be overwritten by environment variables
// Should relate to the use of express.static() in LincdServer.tsx, which makes the build files available through a URL
const ASSET_PATH = process.env.ASSET_PATH || '/js/';
const lincdConfigPath = path.resolve(process.cwd(), 'lincd.config.js');
const lincdConfigPathJson = path.resolve(process.cwd(), 'lincd.config.json');

const cssModes = ['scss-modules', 'tailwind', 'scss', 'mixed'];

//default config
let config: any = {
  //scss-modules is default
  cssMode: cssModes[0],
  analyse: false,
};
//overwriting config from package.json.lincdApp or lincd.config.js(on) file
if (typeof packageJson.lincdApp === 'object') {
  //overwrite default with anything that's defined in lincdApp in package.json
  config = {...config, ...packageJson.lincdApp};
} else if (fs.existsSync(lincdConfigPath)) {
  config = {...config, ...require(lincdConfigPath)};
} else if (fs.existsSync(lincdConfigPathJson)) {
  config = {...config, ...require(lincdConfigPathJson)};
}
if (!cssModes.includes(config.cssMode)) {
  console.warn(
    'Invalid value for property cssMode. Should be one of: ' +
      cssModes.join(', '),
  );
  process.exit();
}

class RebuildScssJsonPlugin {
  apply(compiler) {
    compiler.hooks.watchRun.tap('beforeRun', (comp) => {
      //NOTE: this code takes care of recompiling .scss.json files whenever a .scss file is changed
      // we had to ignore .scss.json files to prevent infinite loops (since its input and output)
      // currently this works, but the build process is one step behind
      // so when devs change a .scss file, only the SECOND time that they change
      // and save that file will the first change in .scss.json pickup
      if (comp.modifiedFiles) {
        let scssFiles = [...comp.modifiedFiles].filter((file) => {
          return path.extname(file) === '.scss';
        });
        if (scssFiles.length) {
          scssFiles.forEach((file) => {
            // Make an entry for each file path that should recompile
            compiler.inputFileSystem.purge(file + '.json');
            compiler.fileTimestamps.set(file + '.json', Date.now());
            compiler.inputFileSystem.purge(file);
            compiler.fileTimestamps.set(file, Date.now());
            // console.log(chalk.magenta('Purged:'), file+'.json');
          });
          // Triggers the recompile, but somehow only after the current emit is finished
          compiler.watching.invalidate(() => {
            // console.log('Recompile finished');
          });

          return;
        }
        // if([...comp.modifiedFiles].every(file => {
        //   return path.extname(file) === ''
        // })) {
        //   // prevent rebuild?
        //   compiler.modifiedFiles = new Set();
        //   compiler.finish((a,b) => {
        //      console.log("Prevented build?",a,b);
        //   });
        //   // compiler.stop(() => {
        //   //   console.log("Prevented build?");
        //   // });
        //   return;
        // }
      }
    });
  }
}
class WatchRunPlugin {
  apply(compiler) {
    compiler.hooks.watchRun.tap('watchRun', (comp) => {
      if (comp.modifiedFiles) {
        const changedFiles = Array.from(
          comp.modifiedFiles,
          (file) => `\n  ${file}`,
        ).join('');
        if (changedFiles.length) {
          console.log(chalk.magenta('Changed files:'), changedFiles);
        }
      }
    });
  }
}
function generateScopedName(name, filename, css) {
  var file = path.basename(filename, '.scss');
  let nearestPackageJson = findNearestPackageJsonSync(filename);
  let packageName = nearestPackageJson
    ? nearestPackageJson.data.name
    : packageJson.name;
  return packageName.replace(/[^a-zA-Z0-9_]+/g, '_') + '_' + file + '_' + name;
}
// getLocalIdent(context,currentFormat,name)
// {
//   var file = path.basename(context.resourcePath,'.scss');
//   return this.package.name.replace(/\-/g,"_") + '_' + file + '_' + name;
// }

let postcssPlugins = [];
if (
  config.cssMode === 'scss-modules' ||
  config.cssMode === 'scss' ||
  config.cssMode === 'mixed'
) {
  postcssPlugins = postcssPlugins.concat([
    // ['stylelint', {
    //   'extends': [
    //     'stylelint-config-standard'
    //   ],
    //   'plugins': ['stylelint-scss'],
    //   'rules': {
    //     'at-rule-no-unknown': null,
    //     'scss/at-rule-no-unknown': [
    //       true,
    //       {
    //         ignoreAtRules: [
    //           'tailwind',
    //           'apply',
    //           'variants',
    //           'responsive',
    //           'screen',
    //         ],
    //       },
    //     ],
    //     'no-descending-specificity': null,
    //     'at-rule-empty-line-before':null,
    //     'rule-empty-line-before': null,
    //     'no-missing-end-of-source-newline': null,
    //     'max-line-length': null,
    //     'color-function-notation': null,
    //     'alpha-value-notation': null,
    //     'number-max-precision':null,
    //   },
    // }],
    'postcss-preset-env',
    isProduction && 'cssnano',
    // "postcss-reporter",
  ]);
  if (config.cssMode === 'scss-modules' || config.cssMode === 'mixed') {
    postcssPlugins.push([
      'postcss-modules',
      {
        generateScopedName: generateScopedName,
        globalModulePaths: (Array.isArray(config.cssGlobalModulePaths)
          ? [/tailwind/, ...config.cssGlobalModulePaths]
          : [/tailwind/, config.cssGlobalModulePaths]
        ).filter(Boolean),
      },
    ]);
  }
}
if (config.cssMode === 'tailwind' || config.cssMode === 'mixed') {
  //make sure that tailwind classes from any LINCD packages that are listed in package.json:dependencies are included
  let lincdPackagePaths: any = getLINCDDependencies(packageJson);
  lincdPackagePaths = lincdPackagePaths.map(([packageName, packagePath]) => {
    return packagePath + '/lib/**/*.{js,mjs}';
  });
  // console.log(
  //   chalk.blueBright('tailwind content: ') + chalk.magenta(['./frontend/src/**/*.{tsx,ts}', ...lincdPackagePaths]),
  // );
  postcssPlugins.push([
    'tailwindcss',
    {
      content: [
        (process.env.SOURCE_PATH || './src/') + '**/*.{tsx,ts}',
        ...lincdPackagePaths,
      ],
      safelist: isProduction
        ? {}
        : {
            //in development mode we allow all classes here, so that you can easily develop
            pattern: /./,
            variants: ['sm', 'md', 'lg', 'xl', '2xl'],
          },
      theme: {
        extend: {
          colors: getLinkedTailwindColors(),
        },
      },
      plugins: [
        tailwindPlugin(function ({addBase, config}) {
          //we can use LINCD CSS variables for default font color, size etc.
          // addBase({
          //   'h1': { fontSize: config('theme.fontSize.2xl') },
          //   'h2': { fontSize: config('theme.fontSize.xl') },
          //   'h3': { fontSize: config('theme.fontSize.lg') },
          // })
        }),
      ],
    },
  ]);
}

// console.log("OUTPUT IN ",path.resolve(process.cwd(), './frontend/build'));
export const webpackAppConfig = {
  mode: isProduction ? 'production' : 'development',
  devtool: isProduction ? 'source-map' : 'cheap-module-source-map',
  entry: [
    isDevelopment && 'webpack-hot-middleware/client',
    path.resolve(
      process.cwd(),
      process.env.ENTRY_PATH ||
        (process.env.SOURCE_PATH
          ? process.env.SOURCE_PATH + '/index.tsx'
          : './src/index.tsx'),
    ),
  ].filter(Boolean),
  watch: isDevelopment || config.analyse,
  output: {
    path: path.resolve(
      process.cwd(),
      process.env.OUTPUT_PATH ||
        (process.env.SOURCE_PATH
          ? process.env.SOURCE_PATH + '/../build'
          : './build'),
    ),
    filename: '[name].bundle.js',
    publicPath: ASSET_PATH,
    clean: true,
  },
  watchOptions: {
    ignored: ['**/*.d.ts', '**/*.js.map', '**/*.scss.json'],
    aggregateTimeout: 500,
  },
  devServer: {
    client: {
      progress: false,
    },
  },
  plugins: [
    // new WatchRunPlugin(),
    new RebuildScssJsonPlugin(),
    new MiniCssExtractPlugin(),
    new webpack.EnvironmentPlugin(Object.keys(process.env)),
    // new ForkTsCheckerWebpackPlugin(),
    isDevelopment && new ReactRefreshWebpackPlugin(),
    isDevelopment && new webpack.HotModuleReplacementPlugin(),
    config.analyse && new BundleAnalyzerPlugin(),
    ...(Array.isArray(config.plugins) ? config.plugins : []),
  ].filter(Boolean),
  externals: config.externals || {},
  module: {
    rules: [
      {
        test: /\.(scss|css)$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              url: false,
              // modules:{
              //     exportOnlyLocals:true,
              //     getLocalIdent: this.getLocalIdent.bind(this),
              //     localIdentName: "[path][name]__[local]--[hash:base64:5]",
              //   },
              importLoaders: 1,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: postcssPlugins,
              },
            },
          },
          {
            loader: 'sass-loader',
            options: {sourceMap: true},
          },
        ],
      },
      // {
      //   test: /\.(ts|tsx)$/,
      //   exclude: /node_modules/,
      //   include: [path.join(process.cwd(),"frontend")], // only bundle files in this directory
      //   use: {
      //     loader: "babel-loader", // cf. .babelrc.json in this folder and browser list in package.json
      //     options: {
      //       plugins: isDevelopment ? ["react-refresh/babel"] : [],
      //       cacheCompression: false,
      //       cacheDirectory: true,
      //     },
      //   },
      // },
      // {
      //   test: /\.m?js/,
      //   resolve: {
      //     fullySpecified: false
      //   }
      // },
      {
        test: /\.tsx?$/,
        use: [
          {
            loader:
              'ts-loader?' +
              JSON.stringify({
                compilerOptions: {
                  //this is required for dynamic imports & code splitting
                  module: 'esnext',
                  moduleResolution: 'node',
                  sourceMap: isDevelopment,
                },
              }),
            options: {
              ...(isDevelopment
                ? {
                    getCustomTransformers: () => ({
                      before: [ReactRefreshTypeScript()],
                    }),
                  }
                : {}),
              transpileOnly: isProduction,
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true,
        },
      }),
    ],
  },
  stats: {
    chunks: false,
    assets: true,
    entrypoints: false,
    children: true,
    modules: false,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.scss', '.scss.json', '.json'],
    alias: config.alias || {},
  },
  //Cache is now overwritten in LincdServer based on config, the other value for type would be 'filesystem'
  //see also https://webpack.js.org/configuration/other-options/#cache
  cache: {type: 'memory'},
};
