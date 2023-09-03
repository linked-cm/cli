/// <reference path="colors.d.ts" />
import colors = require('colors');
import path = require('path');

const webpack = require('webpack');
const {Compilation} = webpack;
export default class DeclarationPlugin {
  options: any;
  moduleName: string;
  excludedReferences: string[];
  logMessages: boolean = true;
  modulePackageInfo: any;
  declarationFiles;
  private exportRoot: string = '/lib';

  constructor(options: any = {}) {
    this.options = options;
    this.options['out'] = options.out ? options.out : './builds/declarations.d.ts';
    this.options['config'] = options.config ? options.config : process.cwd() + '/daconfig.js';

    //var moduleConfig = this.getModuleConfig();
    this.options['root'] = options.root || this.exportRoot; //'/lib'
    this.logMessages = options.debug ? options.debug : false;

    this.modulePackageInfo = require(process.cwd() + '/package.json');
    // this.debug('found package name: '+this.modulePackageInfo.name);
  }

  // apply(compiler) {
  //   // Specify the event hook to attach to
  //   compiler.hooks.emit.tapAsync(
  //     'MyExampleWebpackPlugin',
  //     (compilation, callback) => {
  //
  //     }
  apply(compiler) {
    this.debug('applying ');
    //when the compiler is ready to emit files
    // compiler.plugin('emit', (compilation,callback) =>
    compiler.hooks.compilation.tap('DeclarationPlugin', (compilation) => {
      //NOTE: even though the stage comes from the processAssets hook and not the afterProcessAssets hook
      // somehow this only works WITH the stage defined
      compilation.hooks.afterProcessAssets.tap(
        {
          stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
          name: 'DeclarationPlugin',
        },
        () => {
          // this.debug('indexing and removing declaration assets');
          //collect all generated declaration files
          //and remove them from the assets that will be emitted

          //NOTE: at some point we decided to overwrite declaration files between emits because sometimes only one new declaration file is emitted
          //this may cause issues when you remove a file during the continuous building process, but better than the other way around for now
          if (!this.declarationFiles) {
            this.declarationFiles = {};
          }

          compilation.getAssets().forEach((asset, key) => {
            // this.debug('key '+key.toString())
            // this.debug('value '+Object.getOwnPropertyNames(asset).join(", "))
            // this.debug('asset: ' + asset.name);
            if (asset.name.indexOf('.d.ts') !== -1) {
              if (this.declarationFiles[asset.name]) {
                this.debug('overwriting ' + asset.name);
              }
              this.declarationFiles[asset.name] = asset;

              this.debug('indexed and removed asset: ' + colors.green(asset.name));
              compilation.deleteAsset(asset.name);
            }
          });

          if (Object.keys(this.declarationFiles).length == 0) {
            this.debug(
              "Didn't build .d.ts file because no declaration assets were emitted during build process.".yellow,
            );
            this.debug('This is likely because webpack is using cache.'.yellow);
            this.debug('In watch mode, declaration assets will be emitted once you change a ts(x) source file'.yellow);
            // this.log('Make sure to run '.yellow + 'tsc'.blue + ' before running webpack'.yellow);
            // this.log(
            //   'Make sure to test for '.yellow +
            //   '/(?!.*.d.ts).ts(x?)$/'.blue.bold['underline'] +
            //   ' in the ts-loader in webpack.config.json'.yellow,
            // );
            // this.log(('Assets: ' + Object.keys(compilation.assets).toString()).yellow);
            // callback();
            return;
          }

          //combine them into one declaration file
          var combinedDeclaration = this.generateCombinedDeclaration(this.declarationFiles); //moduleConfig

          //and insert that back into the assets
          // compilation.assets[this.options.out] = {
          //   source: function() {
          //     return combinedDeclaration;
          //   },
          //   size: function() {
          //     return combinedDeclaration.length;
          //   },
          // };

          // As suggested by @JonWallsten here: https://github.com/TypeStrong/ts-loader/pull/1251#issuecomment-800032753
          compilation.emitAsset(this.options.out, new webpack.sources.RawSource(combinedDeclaration));

          //get meta data from module exports
          /*var metaRdfJson = this.generateMetaRdfJson(compilation,moduleConfig);
          //and insert that back into the assets as [module_name].meta.json
          compilation.assets[this.options.out.replace(".d.ts",".meta.rdf.json")] = {
            source: function() {
              return metaRdfJson;
            },
            size: function() {
              return metaRdfJson.length;
            }
          };*/
          //}
        },
      );
    });
  }

  private debug(...msgs) {
    msgs.unshift('declarations:');
    if (this.logMessages) {
      console.log.apply(null, msgs);
    }
  }

  private log(...msgs) {
    msgs.unshift('declarations:');
    console.log.apply(null, msgs);
  }

  private generateCombinedDeclaration(declarationFiles: Object): string {
    this.debug('generating combined declaration');
    var declarations = '';

    //this.debug("daCore: using config ",moduleConfig);
    //this.debug("Combining these files:"+Object.keys(declarationFiles).toString());

    //get current directory that webpack is run from (base of project), and replace backward slashes by forward ones to compare
    var basePath = process.cwd().replace(/\\/g, '/') + '/';
    this.debug('Base path:', colors.blue(basePath));
    var npmModuleName = this.modulePackageInfo.name;
    // let moduleName = npmModuleName.replace(/\@\w+\//, '');
    var importMap = {};

    for (var declarationFileName in declarationFiles) {
      //this.debug("Parsing "+declarationFileName);
      var declarationFile = declarationFiles[declarationFileName];
      var data = declarationFile.source.source();
      if (!data.split) {
        console.warn(typeof data, declarationFileName + ' - cannot split declaration contents. Not a string?');
        continue;
      }
      var lines = data.split('\n');
      var i = lines.length;

      while (i--) {
        var line = lines[i];

        //exclude empty lines
        var excludeLine: boolean = line == '';

        //if importing something, or re-exporting something
        if (/import ([a-z0-9A-Z_\-\*\{\}\s,]+)/.test(line) || /export ([a-z0-9A-Z_-\{\}\s,\*]+) from/.test(line)) {
          var fileImports = line.indexOf('"') !== -1 ? line.match(/\"([^\"]+)\"/) : line.match(/\'([^\']+)\'/);
          if (fileImports && fileImports.length > 1) {
            var importPath = fileImports[1];
            //if it is importing a relative path and it is a new one
            if ((importPath.substr(0, 2) == './' || importPath.substr(0, 3) == '../') && !importMap[importPath]) {
              //we will replace it with the local npm module later, calc and save the absolute path for now
              //we parse from builds, because now TS-LOADER gives paths relative to its output folder
              let parsed = path.parse('./builds/' + declarationFileName);
              let fileDirectory = parsed.dir;
              var absoluteImportPath = path.resolve(fileDirectory, importPath);
              // this.debug('declarationfilename '+declarationFileName);
              // this.debug('filedir '+fileDirectory);

              this.debug('import ' + colors.blue(importPath), ' -> ' + colors.green(absoluteImportPath));
              importMap[importPath] = absoluteImportPath;
            }
          }
        }

        //exclude re-exports
        //excludeLine = excludeLine || (/export ([a-z0-9A-Z_-\{\}\s,\*]+) from/).test(line);

        //exclude unnamed local imports like: import "./some.scss" or import "./someFile"t
        excludeLine = excludeLine || /import ["'][a-z0-9A-Z_\-.\/\\]+["']/.test(line);

        //if defined, check for excluded references
        if (!excludeLine && this.excludedReferences && line.indexOf('<reference') !== -1) {
          excludeLine = this.excludedReferences.some((reference) => line.indexOf(reference) !== -1);
        }

        if (excludeLine) {
          this.debug('Excluding line ' + i + ': ' + line);
          lines.splice(i, 1);
        } else {
          if (line.indexOf('declare ') !== -1) {
            lines[i] = line.replace('declare ', '');
          }
          //add tab
          lines[i] = lines[i];
        }
      }

      //TS Loader now uses paths relative to output dir. so here we remove a single ../ from the path (which is in there because /builds is the output dir and /lib is the relative path of the file)
      let fixedDeclarationPath = declarationFileName.replace(/\\/g, '/').replace('../', '').replace('.d.ts', '');
      var moduleDeclaration = npmModuleName + '/' + fixedDeclarationPath;
      //this.debug('basePath:'+basePath);
      declarations += "declare module '" + moduleDeclaration + "' {\n\t" + lines.join('\n\t') + '\n}\n\n';
      this.debug('Defining module ' + colors.yellow(moduleDeclaration) + ' from ' + colors.blue(declarationFileName));
    }

    for (var relativeImportPath in importMap) {
      let absoluteImportPath = importMap[relativeImportPath];
      let npmImportModule =
        npmModuleName + '/' + absoluteImportPath.substr(basePath.length).replace('.d.ts', '').replace(/\\/g, '/');
      this.debug('Replacing ' + colors.blue(relativeImportPath) + ' with ' + colors.yellow(npmImportModule));

      //wrap in quotes to omit problems with replacing partials and having to fix order of replacements
      declarations = declarations.replace(
        new RegExp('(\'|")' + relativeImportPath + '(\'|")', 'g'),
        '"' + npmImportModule + '"',
      );
    }

    let indexModulePath = this.modulePackageInfo.name + this.exportRoot + '/index';

    this.debug(
      'Replacing index ' + colors.yellow(indexModulePath) + ' with ' + colors.yellow(this.modulePackageInfo.name),
    );
    declarations = declarations.replace("'" + indexModulePath + "'", "'" + this.modulePackageInfo.name + "'");

    //replace alias
    if (this.options.alias) {
      for (let aliasKey in this.options.alias) {
        //declarations = declarations.replace(aliasKey,this.options.alias[aliasKey]);
        this.debug('Replacing alias ' + aliasKey + ' with ' + this.options.alias[aliasKey]);
        declarations = declarations.replace(new RegExp(aliasKey, 'g'), this.options.alias[aliasKey]);
      }
    }

    return declarations;
  }
}
