export interface ModuleConfig {
  internals?: string[] | '*';
  entry?: string;
  filename?: string;
  declarations?: boolean;
  internalsources?: string[];
  externals?: {[npmModule: string]: string};
  target?: 'es5' | 'es6';
  es5?: ModuleConfig;
  es6?: ModuleConfig;
  dev?: ModuleConfig;
  prod?: ModuleConfig;
  debug?: boolean;
  alias?: {[oldNpmPath: string]: string};
  provide?: {};
  environment?: 'nodejs' | 'browser' | 'polymorphic';
  outputPath?: string;
  bundlePath?: string;
  es5Server?: boolean;
  analyse?: boolean;
  cssIdentName?: string;
  beforeBuildCommand?: string;
  afterBuildCommand?: string;
  afterBuildCommandProduction?: string;
  afterFirstBuildCommand?: string;
  cssGlobalModulePaths?: string;
  cssMode?: 'tailwind' | 'postcss';
  cssFileName?: string;
  //used to overwrite tsConfig settings of the usual build process
  tsConfigOverwrites?: Object;
}

export interface AdjustedModuleConfig extends ModuleConfig {
  watch?: boolean;
  productionMode?: boolean;
}

export interface PackageDetails {
  path: string;
  packageName: string;
}

/**
 * Webpack build configuration
 */
export interface LincdWebpackConfig {
  /**
   * Enable webpack filesystem caching for faster rebuilds
   * @default true
   */
  cache?: boolean;

  /**
   * Enable webpack bundle analyzer to visualize bundle size
   * @default false
   */
  analyse?: boolean;

  /**
   * Additional webpack plugins
   */
  plugins?: any[];

  /**
   * Webpack externals configuration - modules to exclude from bundle
   */
  externals?: {[npmModule: string]: string};

  /**
   * Webpack alias configuration for import path shortcuts
   */
  alias?: {[oldNpmPath: string]: string};

  /**
   * Patterns for CSS files that should not use CSS Modules
   */
  cssGlobalModulePaths?: (RegExp | string)[];
}

/**
 * Server-specific configuration
 */
export interface LincdServerConfig {
  /**
   * Paths to cache for server-side rendering (SSR)
   * Cached pages will be served from memory for faster response times
   */
  cachePaths?: string[];

  /**
   * Cache timeout in milliseconds for SSR rendered pages
   * After this time, cached pages will be re-rendered
   * @default 300000 (5 minutes)
   */
  cacheTimeout?: number;

  /**
   * Enable multi-core server processing (requires @semantu/multicore)
   * Spawns worker processes to handle requests across multiple CPU cores
   * @default false
   */
  multiCore?: boolean;

  /**
   * Function that loads the app component (for SSR and hot reloading)
   * Must be a function to support hot module reloading
   */
  loadAppComponent?: () => any;

  /**
   * Function that loads the app routes configuration (for SSR preloading)
   * Must be a function to support hot module reloading
   * Should return a RoutesModule from 'lincd-server'
   */
  loadRoutes?: () => Promise<any>;
}

/**
 * Complete LINCD configuration
 */
export interface LincdConfig {
  /**
   * CSS processing mode (shared by webpack and server for SSR)
   * - 'tailwind': Use Tailwind CSS v4 with @tailwindcss/postcss. Still supports CSS Modules for .module.css files
   * - 'postcss': Use PostCSS with nesting support and CSS Modules for .module.css files
   * @default 'postcss'
   */
  cssMode?: 'tailwind' | 'postcss';

  /**
   * Webpack build configuration
   */
  webpack?: LincdWebpackConfig;

  /**
   * Server configuration
   */
  server?: LincdServerConfig;
}
