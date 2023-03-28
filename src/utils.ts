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
