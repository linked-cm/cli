import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import chalk from 'chalk';
import fs from 'fs';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';
import ReactRefreshTypeScript from 'react-refresh-typescript';
import TerserPlugin from 'terser-webpack-plugin';
import webpack from 'webpack';
import {BundleAnalyzerPlugin} from 'webpack-bundle-analyzer';
import {WebpackManifestPlugin} from 'webpack-manifest-plugin';
import {LincdConfig} from './interfaces.js';
import {generateScopedName} from './utils.js';

import {LinkedFileStorage} from 'lincd/utils/LinkedFileStorage';
import postcssUrl from 'postcss-url';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'),
);

const cssModes = ['tailwind', 'postcss'];

class WatchRunPlugin {
  apply(compiler) {
    compiler.hooks.watchRun.tap('watchRun', (comp) => {
      if (comp.modifiedFiles) {
        const changedFiles = Array.from(comp.modifiedFiles);

        console.log(
          chalk.magenta("Changed files sorted by 'modified time' stamps:"),
        );
        const entriesToCheck = [];

        changedFiles.forEach((file) => {
          try {
            const stat = fs.statSync(file.toString());
            console.log(`  ${chalk.magenta(file)}`);
            entriesToCheck.push({path: file, mtime: stat.mtime});
            if (stat.isDirectory()) {
              const contents = fs.readdirSync(file.toString());
              contents.forEach((name) => {
                const fullPath = path.join(file.toString(), name);
                try {
                  const innerStat = fs.statSync(fullPath);
                  //if less than 2 minutes ago...
                  if (innerStat.mtime > new Date(Date.now() - 2 * 60 * 1000)) {
                    entriesToCheck.push({
                      path: fullPath,
                      mtime: innerStat.mtime,
                    });
                  }
                } catch (e) {
                  entriesToCheck.push({
                    path: fullPath,
                    mtime: new Date(0),
                    error: e.message,
                  });
                }
              });
            }
          } catch (err) {
            entriesToCheck.push({
              path: file,
              mtime: new Date(0),
              error: err.message,
            });
          }
        });

        entriesToCheck
          .sort((a, b) => b.mtime - a.mtime)
          .splice(0, 3)
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

/**
 * Converts a css class name to a unique scoped name (for CSS Modules)
 * @param context
 * @param currentFormat
 * @param name
 */
function getLocalIdent(context, currentFormat, name) {
  // return isProduction ? generateScopedNameProduction(name,context.resourcePath) : generateScopedName(name,context.resourcePath);
  return generateScopedName(name, context.resourcePath);
}

export const getLincdConfig = async (): Promise<LincdConfig> => {
  const lincdConfigPathJs = path.resolve(process.cwd(), 'lincd.config.js');
  const lincdConfigPathJson = path.resolve(process.cwd(), 'lincd.config.json');

  //default config
  let config: LincdConfig = {
    //tailwind is default
    cssMode: cssModes[0] as 'tailwind' | 'postcss',
    webpack: {
      cache: true,
      analyse: false,
    },
    server: {},
  };

  // Load from package.json or config files
  let loaded: any;
  if (typeof packageJson.lincdApp === 'object') {
    loaded = packageJson.lincdApp;
  } else if (fs.existsSync(lincdConfigPathJs)) {
    let lincdConfig = await import(lincdConfigPathJs);
    loaded = lincdConfig.default;
  } else if (fs.existsSync(lincdConfigPathJson)) {
    loaded = JSON.parse(fs.readFileSync(lincdConfigPathJson, 'utf-8'));
  }

  // Backward compatibility: migrate flat structure to nested
  if (loaded) {
    config.cssMode = loaded.cssMode ?? config.cssMode;

    // Move webpack properties
    config.webpack = {
      cache: loaded.webpack?.cache ?? loaded.cacheWebpack ?? true,
      analyse: loaded.webpack?.analyse ?? loaded.analyse,
      plugins: loaded.webpack?.plugins ?? loaded.plugins,
      externals: loaded.webpack?.externals ?? loaded.externals,
      alias: loaded.webpack?.alias ?? loaded.alias,
      cssGlobalModulePaths:
        loaded.webpack?.cssGlobalModulePaths ?? loaded.cssGlobalModulePaths,
    };

    // Move server properties
    config.server = {
      multiCore: loaded.server?.multiCore ?? loaded.multiCore,
      cachePaths: loaded.server?.cachePaths ?? loaded.cachePaths,
      cacheTimeout: loaded.server?.cacheTimeout ?? loaded.cacheTimeout,
      loadAppComponent:
        loaded.server?.loadAppComponent ?? loaded.loadAppComponent,
    };
  }

  if (!cssModes.includes(config.cssMode)) {
    console.warn(
      'Invalid value for property cssMode. Should be one of: ' +
        cssModes.join(', '),
    );
    process.exit();
  }

  return config;
};

export const getWebpackAppConfig = async () => {
  // set up the storage config for the app
  await import(path.join(process.cwd(), 'scripts', 'storage-config.js'));
  const accessURL = LinkedFileStorage.accessURL;

  // set up the public path for the app
  // for Capacitor apps (APP_ENV is set), use /bundles/ since Capacitor's webDir strips /public (see: capacitor.config.ts)
  // for web server builds, use /public/bundles/ to match express.static()
  const isCapacitorBuild = process.env.APP_ENV !== undefined;
  const publicPath = isCapacitorBuild ? '' : '/public';
  const bundlesPath = publicPath + '/bundles/';

  // ASSET_PATH is used load the assets from the correct path
  // if ASSET_PATH is set in environment (app builds), use it directly
  // otherwise, use CDN URL + bundlesPath for production, or bundlesPath for development
  const ASSET_PATH = process.env.ASSET_PATH || 
    (accessURL ? accessURL + bundlesPath : bundlesPath);

  let config = await getLincdConfig();

  let postcssPlugins = [];

  if (config.cssMode === 'tailwind') {
    // Tailwind v4 is configured via CSS directives (@config, @import, @theme)
    // See theme.css for the main configuration
    postcssPlugins.push(['@tailwindcss/postcss', {}]);
  } else {
    // postcss mode: use postcss-nested to enable nesting of css + CSS Modules
    postcssPlugins.push(
      ['postcss-import', {}],
      [
        'postcss-preset-env',
        {
          features: {'nesting-rules': true},
        },
      ],
    );
  }

  /**
   * Rewrite CSS asset URLs for the web bundle while keeping native (Capacitor) paths intact.
   *
   * Examples that will now work transparently in CSS:
   *   url('/images/foo.svg')         -> web: https://cdn/app/public/images/foo.svg
   *                                 -> native: /images/foo.svg (served from bundled webDir)
   *   url('./images/bar.png')       -> web: https://cdn/app/public/images/bar.png
   *   url('/public/images/baz.png') -> web: https://cdn/app/public/images/baz.png
   *
   * Data-URIs and absolute http(s) URLs pass through untouched.
   */
  postcssPlugins.push([
    postcssUrl({
      url: ({url}) => {
        if (!url || url.startsWith('data:')) {
          return url;
        }

        // remove wrapping quotes added by postcss
        let cleanedUrl = url.replace(/^['"]|['"]$/g, '').trim();

        // skip absolute http(s) references
        if (/^https?:\/\//i.test(cleanedUrl)) {
          return cleanedUrl;
        }

        // remove leading ./ to normalise relative imports
        if (cleanedUrl.startsWith('./')) {
          cleanedUrl = cleanedUrl.slice(1);
        }

        // ensure a single leading slash
        if (!cleanedUrl.startsWith('/')) {
          cleanedUrl = `/${cleanedUrl}`;
        }

        // collapse optional /public prefix - CSS can freely use /images/... now
        if (cleanedUrl.startsWith('/public/')) {
          cleanedUrl = cleanedUrl.replace('/public/', '/');
        }

        // For Capacitor builds we keep the relative path (assets are bundled locally)
        if (isCapacitorBuild) {
          return cleanedUrl;
        }

        const baseUrl = (accessURL || '').replace(/\/$/, '');
        return `${baseUrl}${publicPath}${cleanedUrl}`;
      },
    }),
  ]);

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
    watch: isDevelopment || config.webpack?.analyse,
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
      ignored:
        /(^((?!src).)*$|\.d\.ts$|\.js\.map$|\.css\.json$|public|\.idea|[/\\]\..*)/,
      aggregateTimeout: 500,
    },
    devServer: {
      client: {
        progress: false,
      },
    },
    plugins: [
      // new WatchRunPlugin(),
      new MiniCssExtractPlugin({
        ignoreOrder: true,
      }),
      new webpack.EnvironmentPlugin(Object.keys(process.env)),
      isDevelopment && new ReactRefreshWebpackPlugin(),
      isDevelopment && new webpack.HotModuleReplacementPlugin(),
      config.webpack?.analyse && new BundleAnalyzerPlugin(),
      new WebpackManifestPlugin({
        fileName: 'manifest.json',
        publicPath: ASSET_PATH,
        writeToFileEmit: true,
        filter: (file) => /\.(js|css)$/i.test(file.name),
      }),
      ...(Array.isArray(config.webpack?.plugins) ? config.webpack.plugins : []),
    ].filter(Boolean),
    externals: config.webpack?.externals || {},
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                url: false,
                importLoaders: 2,
                modules: {
                  mode: 'local',
                  getLocalIdent: getLocalIdent,
                  auto: (resourcePath: string) => {
                    //make sure this only applies to .module.css files, and not to tailwind
                    return (
                      /\.module\.css$/i.test(resourcePath) &&
                      !/tailwind/i.test(resourcePath)
                    );
                  },
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
          ],
        },
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
                    plugins: [{name: 'typescript-plugin-css-modules'}],
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
      splitChunks: {
        cacheGroups: {
          // Prevent CSS from being split into separate shared chunks
          // Keep all CSS for a lazy-loaded route together in one file
          // This prevents FOUC when lazy routes need multiple CSS chunks
          defaultVendors: false,
          default: false,
        },
      },
    },
    stats: {
      chunks: false,
      assets: true,
      entrypoints: false,
      children: true,
      modules: false,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.css', '.json'],
      alias: config.webpack?.alias || {},
      extensionAlias: {
        '.js': ['.tsx', '.ts', '.js'],
        '.jsx': ['.tsx', '.jsx'],
      },
      // traceResolution: true
    },
    //Cache is now overwritten in LincdServer based on config, the other value for type would be 'filesystem'
    //see also https://webpack.js.org/configuration/other-options/#cache
    cache: config.webpack?.cache
      ? {type: 'filesystem' as 'filesystem'}
      : {type: 'memory' as 'memory'},
  };
};
