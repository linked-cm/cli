import path from 'path';
import chalk from 'chalk';
import ReactRefreshTypeScript from 'react-refresh-typescript';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import webpack from 'webpack';
import fs from 'fs';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import TerserPlugin from 'terser-webpack-plugin';
import {
  generateScopedName,
  generateScopedNameProduction,
  getLINCDDependencies,
  getLinkedTailwindColors,
} from './utils.js';

import tailwindPlugin from 'tailwindcss/plugin.js';
import { LinkedFileStorage } from 'lincd/utils/LinkedFileStorage';
import postcssUrl from 'postcss-url';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(),'package.json'),'utf-8'),
);

const cssModes = ['scss-modules','tailwind','scss','mixed'];

class WatchRunPlugin
{
  apply(compiler)
  {
    compiler.hooks.watchRun.tap('watchRun',(comp) => {
      if (comp.modifiedFiles)
      {
        const changedFiles = Array.from(
          comp.modifiedFiles,
          (file) => `\n  ${file}`,
        ).join('');
        if (changedFiles.length)
        {
          console.log(chalk.magenta('Changed files:'),changedFiles);
        }
      }
    });
  }
}

function getLocalIdent(context,currentFormat,name)
{
  return isProduction ? generateScopedNameProduction(name,context.resourcePath) : generateScopedName(name,context.resourcePath);
}

export const getLincdConfig = async () => {

  const lincdConfigPathJs = path.resolve(process.cwd(),'lincd.config.js');
  const lincdConfigPathJson = path.resolve(process.cwd(),'lincd.config.json');

  //default config
  let config: any = {
    //scss-modules is default
    cssMode: cssModes[0],
    analyse: false,
  };
  //overwriting config from package.json.lincdApp or lincd.config.js(on) file
  if (typeof packageJson.lincdApp === 'object')
  {
    //overwrite default with anything that's defined in lincdApp in package.json
    config = { ...config,...packageJson.lincdApp };
  }
  else if (fs.existsSync(lincdConfigPathJs))
  {
    let lincdConfig = await import(lincdConfigPathJs);
    config = { ...config,...lincdConfig };
  }
  else if (fs.existsSync(lincdConfigPathJson))
  {
    let lincdConfig = JSON.parse(fs.readFileSync(lincdConfigPathJson,'utf-8'));
    config = { ...config,...lincdConfig };
  }
  if (!cssModes.includes(config.cssMode))
  {
    console.warn(
      'Invalid value for property cssMode. Should be one of: ' +
      cssModes.join(', '),
    );
    process.exit();
  }
  return config;
};

export const getWebpackAppConfig = async () => {

  // get from the project's config-frontend file
  await import(path.join(process.cwd(),'scripts','storage-config.js'));
  const accessURL = LinkedFileStorage.accessURL;

  // Should relate to the use of express.static() in LincdServer.tsx, which makes the build files available through a URL
  const publicPath = '/public';
  const bundlesPath = publicPath + '/bundles/';
  // ASSET_PATH mostly used for the apps to load the assets from the correct path
  const ASSET_PATH =
    process.env.ASSET_PATH || accessURL ? accessURL + bundlesPath : bundlesPath;

  let config = await getLincdConfig();

  let postcssPlugins = [
    postcssUrl({
      url: (asset) => {
        return `${accessURL}${publicPath}${asset.url}`;
      },
    }),
  ];
  if (
    config.cssMode === 'scss-modules' ||
    config.cssMode === 'scss' ||
    config.cssMode === 'mixed'
  )
  {
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
    if (config.cssMode === 'scss-modules' || config.cssMode === 'mixed')
    {
      // postcssPlugins.push([
      //   'postcss-modules',
      //   {
      //     generateScopedName: generateScopedName,
      //     globalModulePaths: (Array.isArray(config.cssGlobalModulePaths)
      //         ? [/tailwind/, ...config.cssGlobalModulePaths]
      //         : [/tailwind/, config.cssGlobalModulePaths]
      //     ).filter(Boolean),
      //   },
      // ]);
    }
  }
  if (config.cssMode === 'tailwind' || config.cssMode === 'mixed')
  {
    //make sure that tailwind classes from any LINCD packages that are listed in package.json:dependencies are included
    let lincdPackagePaths: any = getLINCDDependencies(packageJson);
    lincdPackagePaths = lincdPackagePaths.map(([packageName,packagePath]) => {
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
            variants: ['sm','md','lg','xl','2xl'],
          },
        theme: {
          extend: {
            colors: getLinkedTailwindColors(),
          },
        },
        plugins: [
          tailwindPlugin(function({ addBase,config }) {
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

  return {
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
        process.env.OUTPUT_PATH || './public/bundles',
      ),
      filename: '[name].bundle.js',
      publicPath: ASSET_PATH,
      clean: true,
    },
    watchOptions: {
      ignored: ['**/*.d.ts','**/*.js.map','**/*.scss.json'],
      aggregateTimeout: 500,
    },
    devServer: {
      client: {
        progress: false,
      },
    },
    plugins: [
      // new WatchRunPlugin(),
      // new RebuildScssJsonPlugin(),
      new MiniCssExtractPlugin({
        ignoreOrder:true
      }),
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
                importLoaders: 1,
                modules: {
                  mode: 'local',
                  // namedExport:true,
                  //     exportOnlyLocals:true,
                  getLocalIdent: getLocalIdent,
                  localIdentName: '[local]--[hash:base64:6]',
                  //     localIdentName: "[path][name]__[local]--[hash:base64:5]",
                },

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
              options: { sourceMap: true },
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
                    plugins: [{ 'name': 'typescript-plugin-css-modules' }],
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
      extensions: ['.tsx','.ts','.js','.css','.scss','.json'],
      alias: config.alias || {},
    },
    //Cache is now overwritten in LincdServer based on config, the other value for type would be 'filesystem'
    //see also https://webpack.js.org/configuration/other-options/#cache
    cache: { type: 'memory' },
  };
};