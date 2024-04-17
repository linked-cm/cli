/// <reference path="colors.d.ts" />
import colors from 'colors';
import fs from 'fs';

var exportRoot = '/lib';
var libraryName = 'lincd';
var lincdModules = new Map<string, boolean>();

var excluded = new Set();
var includedInternals = new Set();
var excludedExternals = new Set();
var includedLincdModules = new Set();
//This function determines which modules that are requested by the module being built are external
//it basically turns every import from a lincd module into a lookup for that class/object in the global lincd object
//See also: https://webpack.js.org/configuration/externals/
var externaliseModules = function (config, es5) {
  function debug(...msgs) {
    msgs.unshift('externals: ');
    if (config && config.debug) {
      console.log.apply(null, msgs);
    }
  }

  function log(...msgs) {
    msgs.unshift('externals: ');
    console.log.apply(null, msgs);
  }

  // let externalKeys: string[] = config.externals ? Object.keys(config.externals) : [];

  //return the function that is handed to webpack in the 'externals' option.
  //it determines for each request what is external and what is not
  return function ({context, request, contextInfo}, callback) {
    // debug('checking '+request);
    // debug('imported by '+contextInfo.issuer);

    if (config.externals && config.externals[request]) {
      if (!excludedExternals.has(request)) {
        excludedExternals.add(request);
        // debug(colors.magenta('Excluding request as defined in Gruntfile: ' + request));
        debug(colors.red(request) + ' is defined as external --> excluded');
      }

      // return callback(config.externals[request]);
      return callback(null, 'var ' + config.externals[request]);
    }
    //solution to a problem that turned out not to need a solution.
    // But if sub requests of externalized modules go wrong at some point, use this!
    /*let rootRequest = request.substring(0, request.indexOf('/'));
    if (externalKeys.indexOf(rootRequest) !== -1) {
      let key = rootRequest;
      let rest = request.substring(key.length).replace(/\//g, '.');
      // return callback(config.externals[request]);
      debug(
        colors.magenta(
          'Excluding sub request as defined in Gruntfile: ' +
            request +
            ' -> ' +
            config.externals[key] +
            rest,
        ),
      );
      return callback(null, 'var ' + config.externals[request] + rest);
    }*/

    //log(colors.gray(request));
    //"@dacore/core/foo" => "daCore.core.foo"
    // if (/^\@dacore\//.test(request)) {
    //remove @dacore/
    // if (request.indexOf('@dacore') !== 0) {
    // 	console.warn(
    // 		colors.red('this plugin currently works with @dacore modules only'),
    // 	);
    // 	return;
    // }
    // debug(colors.green('request: ' + request));
    if (request.substr(0, 1) == '.' || request.substr(0, 1) == '/') {
      // debug('skipping local');
      callback();
      return;
    }

    if (request.indexOf('lincd/') === 0 && es5) {
      // var result = request.replace("@dacore/core/","@dacore/core-es5/");
      // debug('Requested ES6 for ES5 target: '+colors.yellow(request) + ' => ' + colors.cyan(result));
      debug('Requested ES6 for ES5 target: ' + colors.yellow(request));
      // return callback(null, 'commonjs '+result);
    }

    //get module name without @dacore
    // var transformed = request.substr(8);

    //find @scope and the next part between 2 slashes after
    //so @dacore/some-mod/lib/file.js
    // --> match[0] = @dacore/some-mod
    // --> match[1] = @dacore
    // --> match[2] = some-mod
    let [packageName, scope, cleanPackageName] = request.match(
      /(@[\w\-]+\/)?([\w\-]+)/,
    );

    //if this module is listed as internal module in the config (or if we internalize all modules with '*')
    if (
      config &&
      config.internals &&
      (config.internals.indexOf(packageName) !== -1 || config.internals === '*')
    ) {
      //then don't exclude and don't continue this function

      //only log once
      if (!includedInternals.has(packageName)) {
        includedInternals.add(packageName);
        debug(colors.blue(request) + ' marked internal --> included');
      }
      return callback();
    }

    //check if this module is a lincd module
    let isLincd = isLincdModule(debug, packageName);
    if (isLincd) {
      if (!includedLincdModules.has(packageName)) {
        includedLincdModules.add(packageName);
        debug(
          colors.magenta(
            packageName +
              ' is a lincd module, imports will be excluded from this bundle and refer to a global variable instead',
          ),
        );
      }
    } else {
      //avoid duplicate messages
      if (!excluded.has(packageName)) {
        excluded.add(packageName);
        debug(colors.green(packageName) + ' --> included');
      }
      return callback();
    }

    //remove export root path (for example with lincd/models: the module has lib/ as root, so to get to the exported path lincd.models we need to remove it)
    let cleanRequest = request.replace(exportRoot, '');

    let targetVariable;

    //expects a flat export / global tree with all the modules classes
    //replace - by _ and remove es5, because both es6 and es5 modules will be listed under the bare module name in the global treemap
    let firstSlash = cleanRequest.indexOf('/');

    //if importing {x} from "lincd" (so directly from library without any paths)
    if (firstSlash === -1 && cleanRequest == libraryName) {
      //then we refer straight to the global object
      targetVariable = libraryName;
    } else {
      //for all other cases, there is slash, so lets split module before the first slash and classname after the last slash
      // let module = cleanRequest
      // 	.substr(0, firstSlash)
      // 	.replace(/-/g, '_')
      // 	.replace('_es5', '');

      if (packageName == libraryName) {
        //the library itself should directly expose the main class of each file for clean variable names
        targetVariable = libraryName;
        //targetVariable = libraryName + '.' + className;
      } else {
        //reading this back I'm not sure why module would be empty?

        //Note: we don't include className here anymore, since all linked Components/Utils register themselves as libraryName._modules.moduleName.ComponentName
        //and we don't do default exports, so the import would be `import {ComponentName} from 'foo'` OR `import {ComponentName} from 'foo/lib/components/ComponentName'`
        //Typescript then translates `ComponentName` to `ComponentName_1.ComponentName` in the javascript output
        //And when we build the tree, we put each individual exports of linked components directly under `lincd._modules.moduleName`
        //so here we return the entire module as the result of such imports
        //and ComponentName_1 will contain all things linked/exported by the module
        //and ComponentName_1.ComponentName resolves to the desired class/function
        targetVariable =
          libraryName + "._modules['" + packageName.replace(/\-/g, '_') + "']";

        //import {PersonView} from 'lincd-test/lib/PersonView';
        //lincd._modules.lincd_test
        //PersonView_1
        //PersonView_1.PersonView --> lincd._modules.lincd_test.PersonView

        // targetVariable =
        // 	libraryName +
        // 	'.' +
        // 	(module ? '_modules.' + module + '.' : '') +
        // 	className;
      }
    }

    debug(colors.yellow(request) + ' => ' + colors.cyan(targetVariable));

    //See also: https://webpack.js.org/configuration/externals/
    return callback(null, 'var ' + targetVariable);
    // }
  };
};

function isLincdModule(debug, packageName: string) {
  if (!lincdModules.has(packageName)) {
    // debug(colors.green('checking ' + moduleName + '/package.json'));
    let isLincdModule: boolean;
    let modulePackage;
    try {
      modulePackage = JSON.parse(fs.readFileSync(packageName + '/package.json','utf8'));
    } catch (e) {
      debug(colors.red(packageName + '/package.json' + ' does not exist'));
      // return callback();
    }
    isLincdModule = modulePackage && modulePackage.lincd && true;
    lincdModules.set(packageName, isLincdModule);
  }
  return lincdModules.get(packageName);
}

export default externaliseModules;
