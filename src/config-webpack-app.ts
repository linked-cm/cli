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

// import tailwindPlugin from 'tailwindcss/plugin.js';
import { LinkedFileStorage } from 'lincd/utils/LinkedFileStorage';
import postcssUrl from 'postcss-url';
//@ts-ignore
import plugin from 'tailwindcss/plugin';

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
        // const changedFiles = Array.from(
        //   comp.modifiedFiles,
        //   (file) => `\n  ${file}`,
        // ).join('');
        // if (changedFiles.length)
        // {
        //   console.log(chalk.magenta('Changed files:'),changedFiles);
        // }
        const changedFiles = Array.from(comp.modifiedFiles);

        console.log(chalk.magenta('Changed files:'));
        const entriesToCheck = [];

        changedFiles.forEach((file) => {
          try {
            const stat = fs.statSync(file.toString());
            console.log(`  ${chalk.magenta(file)}`);
            entriesToCheck.push({ path: file, mtime: stat.mtime });
            if (stat.isDirectory()) {
              const contents = fs.readdirSync(file.toString());
              contents.forEach((name) => {
                const fullPath = path.join(file.toString(), name);
                try {
                  const innerStat = fs.statSync(fullPath);
                  entriesToCheck.push({ path: fullPath, mtime: innerStat.mtime });
                } catch (e) {
                  entriesToCheck.push({ path: fullPath, mtime: new Date(0), error: e.message });
                }
              });
            }
          } catch (err) {
            entriesToCheck.push({ path: file, mtime: new Date(0), error: err.message });
          }
        });

        entriesToCheck
          .sort((a, b) => b.mtime - a.mtime)
          .splice(0,7)
          .forEach((entry) => {
            const label = entry.error
              ? `[error: ${entry.error}]`
              : `[${entry.mtime.toISOString()}]`;
            console.log(`  ${entry.path} ${label}`);
          });
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
    config = { ...config,...lincdConfig.default };
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

  let postcssPlugins = [];

  //tailwind first (so its processed last and doesnt overwrite custom CSS modules)
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
      '@tailwindcss/postcss',
      {
        content: [
          (process.env.SOURCE_PATH || './src/') + '**/*.{tsx,ts}',
          ...lincdPackagePaths,
        ],
        // safelist: isProduction
        //   ? {}
        //   : {
        //     //in development mode we allow all classes here, so that you can easily develop
        //     pattern: /./,
        //     variants: ['sm','md','lg','xl','2xl'],
        //   },
        // features: {
        //   themeVariables: {
        //     generateAll: true,
        //   },
        // },
        theme: {
          extend: {
            colors: getLinkedTailwindColors(),
          },
        },
        plugins: [
          plugin(function({ addBase, theme }) {
            //add styles to the base styles
            //this replicates the preflight settings of tailwind v4, but without the destructive/strict #/# selectors
            addBase({
              // Reset all elements except common inline tags and semantic containers
              '*:not(code):not(pre):not(kbd):not(samp):not(mark):not(q):not(ins):not(del):not(span):not(a):not(b):not(i):not(em):not(u):not(s):not(small):not(strong):not(sub):not(sup), ::before, ::after': {
                boxSizing: 'border-box',
                margin: '0',
                padding: '0',
                borderWidth: '0',
                borderStyle: 'solid',
                borderColor: 'currentColor',
              },
              html: {
                lineHeight: '1.5',
                textSizeAdjust: '100%',
                WebkitTextSizeAdjust: '100%',
                MozTextSizeAdjust: '100%',
                fontFamily: 'system-ui, sans-serif',
              },
              body: {
                margin: '0',
                lineHeight: 'inherit',
                backgroundColor: 'white',
              },
              hr: {
                height: '0',
                color: 'inherit',
                borderTopWidth: '1px',
              },
              abbr: {
                textDecoration: 'underline dotted',
              },
              'b, strong': {
                fontWeight: 'bolder',
              },
              'code, kbd, samp, pre': {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '1em',
              },
              small: {
                fontSize: '80%',
              },
              'sub, sup': {
                fontSize: '75%',
                lineHeight: '0',
                position: 'relative',
                verticalAlign: 'baseline',
              },
              sub: { bottom: '-0.25em' },
              sup: { top: '-0.5em' },
              table: {
                textIndent: '0',
                borderColor: 'inherit',
                borderCollapse: 'collapse',
              },
              'button, input, optgroup, select, textarea': {
                font: 'inherit',
                color: 'inherit',
                margin: '0',
                padding: '0',
                lineHeight: 'inherit',
                backgroundColor: 'transparent',
                borderColor: 'inherit',
              },
              'button, select': {
                textTransform: 'none',
              },
              'button, [type="button"], [type="reset"], [type="submit"]': {
                appearance: 'button',
                WebkitAppearance: 'button',
              },
              '::-moz-focus-inner': {
                borderStyle: 'none',
                padding: '0',
              },
              ':-moz-focusring': {
                outline: 'auto',
              },
              ':-moz-ui-invalid': {
                boxShadow: 'none',
              },
              fieldset: {
                margin: '0',
                padding: '0',
                border: '0',
              },
              legend: {
                padding: '0',
              },
            });
          }),
        ],
        // plugins: [
          // tailwindPlugin(function({ addBase,config }) {
          //   //we can use LINCD CSS variables for default font color, size etc.
          //   // addBase({
          //   //   'h1': { fontSize: config('theme.fontSize.2xl') },
          //   //   'h2': { fontSize: config('theme.fontSize.xl') },
          //   //   'h3': { fontSize: config('theme.fontSize.lg') },
          //   // })
          // }),
        // ],
      },
    ]);
  }
  postcssPlugins.push([
    postcssUrl({
      url: (asset) => {
        //This convert URLs used in CSS and adds the full public URL instead of a local path
        //TODO: for assets of packages, we want to detect the package path and resolve through node_modules/package-name/...something/assets
        if(!asset.url.startsWith('data:'))
        {
          // console.log('Transform CSS URL:'+asset.url);
          return `${accessURL}${publicPath}${asset.url}`;
        }
        return asset.url;
      },
    }),
  ])
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
      //NOTE: this is replaced with the css-loader
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

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
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
      //ignore everything except the src folder. ignore specific files in the src folder
      ignored: /(^((?!src).)*$|\.d\.ts$|\.js\.map$|\.scss\.json$|node_modules|public|\.idea|[/\\]\..*)/,
      aggregateTimeout: 500,
    },
    devServer: {
      client: {
        progress: false,
      },
    },
    plugins: [
      new WatchRunPlugin(),
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
                  // exclude:/tailwind/i,
                  getLocalIdent: getLocalIdent,
                  // auto: (resourcePath: string) => {
                  //   // Use CSS Modules for everything except node_modules/tailwind
                  //   return !/node_modules[\\/]tailwind/.test(resourcePath);
                  // },
                  auto: (resourcePath: string) => {
                    //make sure this only applies to .module.css files, and not to tailwind
                    return /\.module\.css$/i.test(resourcePath) && !/tailwind/i.test(resourcePath);
                  }
                  // localIdentName: '[local]--[hash:base64:6]',
                  // localIdentName: '[local]',
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
            // {
            //   loader: 'sass-loader',
            //   options: { sourceMap: true },
            // },
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