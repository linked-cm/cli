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
  cssMode?: 'scss' | 'scss-modules' | 'tailwind' | 'mixed';
  cssFileName?: string;
  //used to overwrite tsConfig settings of the usual build process
  tsConfigOverwrites?: Object;
}

export interface AdjustedModuleConfig extends ModuleConfig {
  watch?: boolean;
  productionMode?: boolean;
}
