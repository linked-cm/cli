import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import {exec} from 'child_process';

const {findNearestPackageJson, findNearestPackageJsonSync} = require('find-nearest-package-json');

export var getPackageJSON = function (root = process.cwd(), error = true) {
  let packagePath = path.join(root, 'package.json');
  if (fs.existsSync(packagePath)) {
    return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  } else if (root === process.cwd()) {
    if (error) {
      console.warn(
        'Could not find package.json. Make sure you run this command from the root of a lincd module or a lincd yarn workspace',
      );
      process.exit();
    }
  }
};

/**
 * Scans package.json for dependencies that are LINCD packages
 * Also looks into dependencies of dependencies
 * If no packageJson is given, it will attempt to obtain it from the current working directory
 * Returns an array of lincd packages, with each entry containing an array with the package name and the local path to the package
 * @param packageJson
 */
export var getLINCDDependencies = function (
  packageJson?,
  checkedPackages: Set<string> = new Set(),
): [string, string, string[]][] {
  if (!packageJson) {
    packageJson = getPackageJSON();
  }
  let dependencies = {...packageJson.dependencies, ...packageJson.devDependencies};
  let lincdPackagePaths: [string, string, string[]][] = [];
  let firstTime = checkedPackages.size === 0;

  for (var dependency of Object.keys(dependencies)) {
    try {
      if (!checkedPackages.has(dependency)) {
        let [modulePackageJson, modulePath] = getModulePackageJSON(dependency);
        checkedPackages.add(dependency);

        if (modulePackageJson?.lincd) {
          lincdPackagePaths.push([
            modulePackageJson.name,
            modulePath,
            [...Object.keys({...modulePackageJson.dependencies, ...modulePackageJson.devDependencies})],
          ]);
          //also check if this package has any dependencies that are lincd packages
          lincdPackagePaths = lincdPackagePaths.concat(getLINCDDependencies(modulePackageJson, checkedPackages));
        }
        if (!modulePackageJson) {
          //this seems to only happen with yarn workspaces for some grunt related dependencies of lincd-cli
          // console.log(`could not find package.json of ${dependency}`);
        }
      }
    } catch (err) {
      console.log(`could not check if ${dependency} is a lincd package: ${err}`);
    }
  }

  if (firstTime) {
    // let dependencyMap:Map<string,Set<string>> = new Map();
    let lincdPackageNames = new Set(lincdPackagePaths.map(([packageName, modulePath, pkgDependencies]) => packageName));
    //remove lincd-cli from the list of lincd packages
    lincdPackageNames.delete('lincd-cli');

    lincdPackagePaths.forEach(([packageName, modulePath, pkgDependencies], key) => {
      let lincdDependencies = pkgDependencies.filter((dependency) => lincdPackageNames.has(dependency));
      if (packageName === 'lincd-cli') {
        //remove lincd-modules from the dependencies of lincd-cli (it's not a hard dependency, and it messes things up)
        lincdDependencies.splice(lincdDependencies.indexOf('lincd-modules'), 1);
      }
      // dependencyMap.set(packageName, new Set(lincdDependencies));
      //update dependencies to be the actual lincd package objects
      lincdPackagePaths[key][2] = lincdDependencies;
    });

    // //add the nested dependencies for each lincd package
    // for (let [packageName,pkgDependencies] of dependencyMap) {
    //   pkgDependencies.forEach((dependency) => {
    //     if (dependencyMap.has(dependency)) {
    //       dependencyMap.get(dependency).forEach((nestedDependency) => {
    //         pkgDependencies.add(nestedDependency);
    //       });
    //     }
    //   });
    // }
    //
    // dependencyMap.forEach((dependencies,packageName) => {
    //   //check for circular dependencies
    //   if([...dependencies].some(dependency => {
    //     return dependencyMap.get(dependency).has(packageName);
    //   }))
    //   {
    //     console.warn(`Circular dependency detected between ${packageName} and ${dependency}`);
    //   }
    //
    // });

    // a simple sort with dependencyMap doesn't seem to work,so we start with LINCD (least dependencies) and from there add packages that have all their dependencies already added
    let sortedPackagePaths = [];
    let addedPackages = new Set(['lincd']);
    sortedPackagePaths.push(
      lincdPackagePaths.find(([packageName]) => {
        return packageName === 'lincd';
      }),
    );

    while (addedPackages.size !== lincdPackagePaths.length) {
      let startSize = addedPackages.size;
      lincdPackagePaths.forEach(([packageName, modulePath, pkgDependencies]) => {
        if (!addedPackages.has(packageName) && pkgDependencies.every((dependency) => addedPackages.has(dependency))) {
          sortedPackagePaths.push([packageName, modulePath, pkgDependencies]);
          addedPackages.add(packageName);
        }
      });
      if (startSize === addedPackages.size) {
        console.warn('Could not sort lincd packages, circular dependencies?');
        break;
      }
    }

    //sort the lincd packages by least dependent first
    // lincdPackagePaths = lincdPackagePaths.sort(([packageNameA],[packageNameB]) => {
    //   //if package A depends on package B, then package B should come first
    //   if (dependencyMap.get(packageNameA).has(packageNameB)) {
    //     console.log(packageNameA+' depends on '+packageNameB+ ' (below)')
    //       return 1;
    //   }
    //   console.log(packageNameA+' above '+packageNameB)
    //   return -1;
    // });
    return sortedPackagePaths;
  }

  return lincdPackagePaths;
};

//from https://github.com/haalcala/node-packagejson/blob/master/index.js
export var getModulePackageJSON = function (module_name, work_dir?) {
  if (!work_dir) {
    work_dir = process.cwd();
  } else {
    work_dir = path.resolve(work_dir);
  }

  var package_json;

  if (fs.existsSync(path.resolve(work_dir, './node_modules'))) {
    var module_dir = path.resolve(work_dir, './node_modules/' + module_name);

    if (fs.existsSync(module_dir) && fs.existsSync(module_dir + '/package.json')) {
      package_json = JSON.parse(fs.readFileSync(module_dir + '/package.json', 'utf-8'));
    }
  }

  if (!package_json && work_dir != '/') {
    return getModulePackageJSON(module_name, path.resolve(work_dir, '..'));
  }

  return [package_json, module_dir];
};
export var getGruntConfig = function (root = process.cwd(), error = true) {
  let gruntFile = path.join(root, 'Gruntfile.js');
  if (fs.existsSync(gruntFile)) {
    return require(gruntFile)();
  } else if (root === process.cwd()) {
    if (error) {
      console.warn(
        'Could not find Gruntfile.js. Make sure you run this command from the root of a lincd module or a lincd yarn workspace',
      );
      process.exit();
    }
  }
};

export function execp(cmd, log: boolean = false, allowError: boolean = false, options: any = {}): Promise<null> {
  // opts || (opts = {});
  if (log) console.log(chalk.cyan(cmd));

  return new Promise((resolve, reject) => {
    var child = exec(cmd, options);

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    // process.stdin.pipe(child.stdin);

    child.on('close', function (code) {
      if (code === 0) {
        resolve(null);
      } else {
        reject();
      }
      // console.log('killing child');
      // child.kill('SIGHUP');
      // resolve(code);
    });
    // child.on('data', function (result) {
    // 	// if (log)
    // 	// {
    // 	// 	console.log(result);
    // 	// }
    // 	resolve(result);
    // 	console.log('resolve data');
    //
    // });

    child.on('error', function (err) {
      if (!allowError) {
        // console.log('reject err');
        reject(err);
        return;
      } else if (log) {
        console.warn(err);
      }
      // console.log('resolve err');
      resolve(null);
    });
    child.on('exit', function (code, signal) {
      if (code !== 0) {
        reject('Child process exited with error code ' + code);
        return;
      }
      // console.log('resolve exit');
      resolve(null);
    });
  });
}

export function execPromise(
  command,
  log = false,
  allowError: boolean = false,
  options?: any,
  pipeOutput: boolean = false,
): Promise<string> {
  return new Promise(function (resolve, reject) {
    if (log) console.log(chalk.cyan(command));
    let child = exec(command, options, (error, stdout, stderr) => {
      if (error) {
        if (!allowError) {
          reject({error, stdout, stderr});
          return;
        } else if (log) {
          console.warn(error);
        }
      }
      //TODO: getting a typescript error for 'trim()', this worked before, is it still used? do we log anywhere?
      let result = stdout['trim']();
      if (log) {
        // console.log(chalk"RESOLVING "+command);
        console.log(result);
        // console.log('ERRORS:'+(result.indexOf('Aborted due to warnings') !== -1));
        // console.log('stderr:'+stderr);
      }
      resolve(result);
    });
    if (pipeOutput) {
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
    }
  });
}

// export function generateScopedName(moduleName,name, filename, css) {
export function generateScopedName(moduleName, name, filename, css) {
  // console.log(moduleName,name,filename,css);
  var file = path.basename(filename, '.scss');
  let nearestPackageJson = findNearestPackageJsonSync(filename);
  let packageName = nearestPackageJson ? nearestPackageJson.data.name : moduleName;
  return packageName.replace(/[^a-zA-Z0-9_]+/g, '_') + '_' + file + '_' + name;

  // process.exit();
  // var path = require('path');
  var file = path.basename(filename, '.scss');

  var module = filename.match(/[\\\/]modules[\\\/]([\w\-_]+)/);
  var moduleName;
  if (module) {
    moduleName = module[1];
  } else {
    //if we cant find module name from path, we'll use a hash
    //https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
    var hash = 0;
    if (filename.length == 0) {
      moduleName = '_unknown';
    } else {
      for (var i = 0; i < filename.length; i++) {
        var char = filename.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      moduleName = hash;
    }
  }
  // console.log("Module name: "+moduleName);
  // console.log("Returning: " + moduleName + "_" + file + "_" + name);
  return moduleName + '_' + file + '_' + name;
}

export function log(...messages) {
  messages.forEach((message) => {
    console.log(chalk.cyan(message));
  });
}

export function debug(config, ...messages) {
  if (config.debug) {
    log(...messages);
  }
}

export function warn(...messages) {
  messages.forEach((message) => {
    console.log(chalk.red(message));
  });
}

export function flatten(arr) {
  return arr.reduce(function (a, b) {
    return b ? a.concat(b) : a;
  }, []);
}

export function getLinkedTailwindColors() {
  return {
    'primary-color': 'var(--primary-color)',
    'font-color': 'var(--font-color)',
  };
}
