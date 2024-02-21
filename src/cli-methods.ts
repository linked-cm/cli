import chalk from 'chalk';
import {exec} from 'child_process';
import depcheck from 'depcheck';
import {getEnvFile} from 'env-cmd/dist/get-env-vars';
import fs from 'fs-extra';
import path from 'path';
import {
  debugInfo,
  execPromise,
  execp,
  getFileImports,
  getLastCommitTime,
  getPackageJSON,
  isValidLINCDImport,
  needsRebuilding,
} from './utils';

import {statSync} from 'fs';

import postcss from 'postcss';
import postcssModules from 'postcss-modules';
import {PackageDetails} from 'interfaces';

var glob = require('glob');
var variables = {};
var open = require('open');
var stagedGitFiles = require('staged-git-files');
import {
  findNearestPackageJson,
  findNearestPackageJsonSync,
} from 'find-nearest-package-json';

export const createApp = async (name, basePath = process.cwd()) => {
  if (!name) {
    console.warn('Please provide a name as the first argument');
  }
  let {hyphenName, camelCaseName, underscoreName} = setNameVariables(name);

  let targetFolder = path.join(basePath, hyphenName);
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder);
  }

  fs.copySync(
    path.join(__dirname, '..', 'defaults', 'app-with-backend'),
    targetFolder,
  );
  //make sure the data folder exists (even though its empty).. copying empty folders does not work with fs.copySync
  fs.mkdirSync(path.join(targetFolder, 'data'), {recursive: true});
  fs.mkdirSync(path.join(targetFolder, 'data/uploads/resized'), {
    recursive: true,
  });

  fs.renameSync(
    path.join(targetFolder, 'gitignore.template'),
    path.join(targetFolder, '.gitignore'),
  );
  fs.renameSync(
    path.join(targetFolder, 'yarnrc.yml.template'),
    path.join(targetFolder, '.yarnrc.yml'),
  );

  // fs.copySync(path.join(__dirname, '..', 'defaults', 'app'), targetFolder);

  log("Creating new LINCD application '" + name + "'");

  //replace variables in some copied files
  await replaceVariablesInFolder(targetFolder);

  let hasYarn = await hasYarnInstalled();
  let installCommand = hasYarn
    ? 'export NODE_OPTIONS="--no-network-family-autoselection" && yarn install'
    : 'npm install';

  await execp(`cd ${hyphenName} && ${installCommand}`, true).catch((err) => {
    console.warn('Could not install dependencies or start application');
  });

  log(
    `Your LINCD App is ready at ${chalk.blueBright(targetFolder)}`,
    `To start, run\n${chalk.blueBright(
      `cd ${hyphenName}`,
    )} and then ${chalk.blueBright((hasYarn ? 'yarn' : 'npm') + ' start')}`,
  );
};

function logHelp() {
  execp('yarn exec lincd help');
}

function log(...messages) {
  messages.forEach((message) => {
    console.log(chalk.cyan('Info: ') + message);
  });
}

function progressUpdate(message) {
  process.stdout.write(
    '                                                                    \r',
  );
  process.stdout.write(message + '\r');
}

export function warn(...messages) {
  messages.forEach((message) => {
    console.log(chalk.magenta('Warning: ') + message);
    // console.log(chalk.red(message));
  });
}

export function developPackage(target, mode) {
  if (!target) target = 'es6';
  if (mode !== 'production') mode = '';
  else if (target !== 'es6')
    log('target must be es6 when developing for production');
  if (target == 'es5' || target == 'es6') {
    // log('> Starting continuous development build for '+target+' target')
    log('starting continuous development build');
    log(
      'grunt dev' +
        (target ? '-' + target : '') +
        (mode ? '-' + mode : '') +
        ' --color',
    );
    var command = exec(
      'grunt dev' +
        (target ? '-' + target : '') +
        (mode ? '-' + mode : '') +
        ' --color',
    );
    command.stdout.pipe(process.stdout);
    command.stderr.pipe(process.stderr);
  } else {
    console.warn('unknown build target. Use es5 or es6');
  }
}

function checkWorkspaces(rootPath, workspaces, res) {
  // console.log('checking workspaces at '+rootPath+": "+workspaces.toString());
  if (workspaces.packages) {
    workspaces = workspaces.packages;
  }

  workspaces.forEach((workspace) => {
    let workspacePath = path.join(rootPath, workspace.replace('/*', ''));
    if (workspace.indexOf('/*') !== -1) {
      // console.log(workspacePath);
      if (fs.existsSync(workspacePath)) {
        let folders = fs.readdirSync(workspacePath);
        folders.forEach((folder) => {
          if (folder !== './' && folder !== '../') {
            checkPackagePath(rootPath, path.join(workspacePath, folder), res);
          }
        });
      }
    } else {
      checkPackagePath(rootPath, workspacePath, res);
    }
  });
}

function checkPackagePath(rootPath, packagePath, res) {
  let packageJsonPath = path.join(packagePath, 'package.json');
  // console.log('checking '+packagePath);
  if (fs.existsSync(packageJsonPath)) {
    var pack = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    //some packages are not true lincd packages, but we still want them to be re-built automatically. This is what lincd_util is for
    if (pack && pack.workspaces) {
      checkWorkspaces(packagePath, pack.workspaces, res);
    } else if (pack && pack.lincd === true) {
      res.push({
        path: packagePath,
        packageName: pack.name,
      });
    }
  }
}

function runOnPackagesGroupedByDependencies(
  lincdPackages,
  onBuildStack: (
    packageGroup,
    dependencies,
  ) => (pkg: PackageDetails) => Promise<any>,
  onStackEnd,
  sync = false,
) {
  let dependencies: Map<PackageDetails, PackageDetails[]> = new Map();

  //get dependencies of each package
  let leastDependentPackage;
  lincdPackages.forEach((pkg) => {
    var pack = getPackageJSON(pkg.path);
    if (pack) {
      //get lincd related dependencies and get the actual package details from the package map by removing '@dacore/' from the package name
      let packageDependencies = Object.keys(pack.dependencies)
        .filter((dependency) => lincdPackages.has(dependency))
        .map((dependency) => {
          return lincdPackages.has(dependency)
            ? lincdPackages.get(dependency)
            : dependency;
        });
      // console.log(package.packageName,packageDependencies.map())
      dependencies.set(pkg, packageDependencies);
    }
  });

  dependencies.forEach((PackageDependencies, pkg) => {
    if (
      !PackageDependencies.some((dependency) => {
        return (
          typeof dependency !== 'string' &&
          lincdPackages.has(dependency.packageName)
        );
      })
    ) {
      leastDependentPackage = pkg;
    }
  });

  let startStack: PackageDetails[] = [leastDependentPackage];

  const runPackage = (runFunction, pck) => {
    return runFunction(pck)
      .catch(({error, stdout, stderr}) => {
        warn(
          'Uncaught exception whilst running parallel function on ' +
            pck.packageName,
          error.message,
        );
        // warn(chalk.red(pck.packageName+' failed:'));
        // console.log(stdout);
      })
      .then((res) => {
        done.add(pck);
        return res;
      });
  };

  let done: Set<PackageDetails> = new Set();
  let results = [];
  let runStack = async (stack) => {
    let runFunction = onBuildStack(stack, dependencies);
    let stackPromise: Promise<any>;
    if (sync) {
      //build the stack in parallel
      stackPromise = Promise.resolve(true);
      stack.forEach((pck) => {
        stackPromise = stackPromise.then(() => {
          return runPackage(runFunction, pck);
        });
      });
    } else {
      //build the stack in parallel
      stackPromise = Promise.all(
        stack.map((pck) => {
          return runPackage(runFunction, pck);
        }),
      );
    }

    //wait till stack is completed
    let stackResults = await stackPromise;
    results = results.concat(stackResults);

    //clear stack for next round
    stack = [];

    //find those packages who have all their dependencies already built and add them to the stack
    lincdPackages.forEach((pkg) => {
      let deps = dependencies.get(pkg);

      //if the package is not done yet
      //but every dependency is now done OR was not something we can build (some @dacore dependencies may not be local)
      if (
        !done.has(pkg) &&
        deps.every((dependency) => {
          return (
            typeof dependency !== 'string' &&
            (done.has(dependency) || !lincdPackages.has(dependency.packageName))
          );
        })
      ) {
        stack.push(pkg);
      }
    });

    if (stack.length <= 0 && done.size < lincdPackages.size) {
      console.log(
        chalk.red(
          'Only ' +
            done.size +
            ' out of ' +
            lincdPackages.size +
            ' packages have been built',
        ),
      );
      console.log(
        'ALL remaining packages have dependencies that have not been met. This may point to ' +
          chalk.red('circular dependencies.'),
      );
      console.log(
        'Already built: ' +
          Array.from(done)
            .map((p) => chalk.green(p.packageName))
            .join(', '),
      );
      console.log(
        chalk.blue('\nTo solve this issue') +
          ': find the circular dependencies below and fix the dependencies:\n\n',
      );
      //TODO: actually find and name the packages that have circular dependencies
      // let circular = [];
      // lincdPackages.forEach((pkg) => {
      //   if (!done.has(pkg))
      //   {
      //     let deps = dependencies.get(pkg);
      //     if (deps.some(dependency => {
      //       //return true if this dependency (indirectly) depends on the package whos' dependency it is
      //       return hasDependency(dependency,pkg,dependencies)
      //     }))
      //     {
      //       circular.push(pkg);
      //     }
      //     process.exit();
      //   }
      // });
      lincdPackages.forEach((pkg) => {
        let deps = dependencies.get(pkg);
        if (!done.has(pkg)) {
          console.log(
            chalk.red(pkg.packageName) +
              ' has not been built yet. Unbuilt dependencies:\n' +
              deps
                .filter((dependency) => {
                  return !Array.from(done).some((p) => {
                    // console.log(p.packageName,dependency.packageName,p===dependency)
                    return p === dependency;
                  });
                })
                .map((p) =>
                  chalk.red(
                    '\t- ' +
                      (p?.packageName ? p.packageName : p.toString()) +
                      '\n',
                  ),
                )
                .join(' '),
          );
          // console.log(chalk.red(pkg.packageName)+' has not been built yet. Built dependencies:\n' + deps.filter(dependency => {
          //   return Array.from(done).some(p => p.packageName === pkg.packageName)
          // }).map(p => chalk.green('\t- '+p.packageName+'\n')).join(" "))
          // console.log(chalk.red(pkg.packageName)+' has not been built yet. Built dependencies:\n' + deps.filter(dependency => done.has(pkg)).map(p => chalk.green('\t- '+p.packageName+'\n')).join(" "))
        }
      });
    }

    //if more to be built, iterate
    if (stack.length > 0) {
      return runStack(stack);
    } else {
      onStackEnd(dependencies, results.filter(Boolean));
    }
  };

  //starts the process
  runStack(startStack);
}

function hasDependency(pkg, childPkg, dependencies, depth = 1) {
  console.log(
    'Does ' + pkg.packageName + ' have dep ' + childPkg.packageName + ' ?',
  );
  let deps = dependencies.get(pkg);
  if (
    deps.some((dependency) => {
      console.log(
        dependency.packageName,
        childPkg.packageName,
        dependency === childPkg,
      );
      if (depth === 2) return false;
      // return dependency === childPkg;
      return (
        dependency === childPkg ||
        hasDependency(dependency, childPkg, dependencies, depth++)
      );
    })
  ) {
    console.log('##YES');
    return true;
  }
  console.log('going up');
  return false;
}

export function buildAll(options) {
  console.log(
    'Building all LINCD packages of this repository in order of dependencies',
  );
  let lincdPackages = getLocalLincdPackageMap();

  let startFrom: string;
  //by default start building
  let building: boolean = true;

  let from = options?.from;
  let sync = options?.sync || false;

  // console.log('from', from);
  // console.log('sync', sync);
  // process.exit();

  //option to start from a specific package in the stack
  if (from) {
    startFrom = from;
    //if we have a startFrom, then we havnt started the build process yet
    building = startFrom ? false : true;

    //clear targets
    // target = '';
    // target2 = '';
    console.log(chalk.blue('Will skip builds until ' + startFrom));

    // return async (pkg) => {};
  }
  // if (target2 == 'from') {
  //   startFrom = target3;
  //   //if we have a startFrom, then we havnt started the build process yet
  //   building = startFrom ? false : true;
  //
  //   //clear targets
  //   target2 = '';
  //   target3 = '';
  //   console.log(chalk.blue('Will skip builds until ' + startFrom));
  //
  //   // return async (pkg) => {};
  // }

  let done: Set<PackageDetails> = new Set();
  let failedModules = [];

  progressUpdate(lincdPackages.size + ' packages left');

  let packagesLeft = lincdPackages.size;
  // let packagesLeft = lincdPackages.size - done.size;
  runOnPackagesGroupedByDependencies(
    lincdPackages,
    (packageGroup, dependencies) => {
      if (done.size > 0) {
        debugInfo(
          chalk.magenta(
            '\n-------\nThese packages are next, since all their dependencies have now been build:',
          ),
        );
        // log(stack);
      }
      debugInfo(
        'Now building: ' + chalk.blue(packageGroup.map((i) => i.packageName)),
      );
      return async (pkg: PackageDetails) => {
        let command;
        let skipping = false;
        //if we're skipping builds until a certain package
        if (!building) {
          //if the package name matches the package we're supposed to start from then start building packages
          if (pkg.packageName == startFrom || pkg.packageName == startFrom) {
            building = true;
          }
          //else still waiting for the package
          else {
            log(chalk.blue('skipping ' + pkg.packageName));
            command = Promise.resolve(true);
            skipping = true;
          }
        }
        //unless told otherwise, build the package
        if (!command) {
          command = execPromise(
            'cd ' + pkg.path + ' && yarn exec lincd build',
            // (target ? ' ' + target : '') +
            // (target2 ? ' ' + target2 : ''),
            false,
            false,
            {},
            false,
          );
          log(chalk.cyan('Building ' + pkg.packageName));
          process.stdout.write(packagesLeft + ' packages left\r');
        }

        return command
          .catch(({error, stdout, stderr}) => {
            //this prints out the webpack output, including the build errors
            warn('Failed to build ' + pkg.packageName);
            console.log(stdout);
            failedModules.push(pkg.packageName);
            let dependentModules = getDependentPackages(dependencies, pkg);
            if (dependentModules.length > 0) {
              printBuildResults(failedModules, done);
              console.log(
                chalk.magenta(
                  'Stopping build process because an error occurred whilst building ' +
                    pkg.packageName +
                    ', which ' +
                    dependentModules.length +
                    ' other packages depend on.',
                ),
              ); //"+dependentModules.map(d => d.packageName).join(", ")));
              console.log(
                chalk.cyanBright('tip ') +
                  'Run ' +
                  chalk.green(`lincd build-all --from=${pkg.packageName}`) +
                  ' to build only the remaining packages',
              ); //"+dependentModules.map(d => d.packageName).join(", ")));
              process.exit(1);
            }
          })
          .then((res) => {
            if (!skipping) {
              log(chalk.green('Built ' + pkg.packageName));
            }
            done.add(pkg);

            packagesLeft--;
            // log(chalk.magenta(packagesLeft + ' packages left'));
            process.stdout.write(packagesLeft + ' packages left\r');
            if (packagesLeft == 0) {
              printBuildResults(failedModules, done);
              if (failedModules.length > 0) {
                process.exit(1);
              }
            }

            return res;
          });
      };
    },
    (dependencies) => {
      //if no more packages to build but we never started building...
      if (!building) {
        console.log(
          chalk.red(
            'Could not find the package to start from. Please provide a correct package name or package name to build from',
          ),
        );
      } else {
        //Detecting cyclical dependencies that caused some packages not to be build
        let first = true;
        lincdPackages.forEach((pkg) => {
          if (!done.has(pkg)) {
            let deps = dependencies.get(pkg);
            if (first) {
              console.log(
                chalk.red(
                  'CYCLICAL DEPENDENCIES? - could not build some packages because they depend on each other.',
                ),
              );
              first = false;
            }
            //print the cyclical dependencies
            console.log(
              chalk.red(pkg.packageName) +
                ' depends on ' +
                deps
                  .filter((dependency) => {
                    return typeof dependency !== 'string';
                  })
                  .map((d: PackageDetails) => {
                    return done.has(d)
                      ? d.packageName
                      : chalk.red(d.packageName);
                  })
                  .join(', '),
            );

            //also print some information why these packages have not been moved into the stack
            let stringDependencies = deps.filter((d) => typeof d === 'string');
            if (stringDependencies.length > 0) {
              console.log(
                chalk.red(
                  'And it depends on these package(s) - which seem not to be proper packages :' +
                    stringDependencies.join(', '),
                ),
              );
              console.log(
                chalk.red(
                  'Could you remove this from dependencies? Should it be a devDependency?',
                ),
              );
            }
          }
        });
      }
    },
    sync,
  );
}

function getDependentPackages(dependencies, pkg): PackageDetails[] {
  let dependentModules: PackageDetails[] = [];
  dependencies.forEach((dModuleDependencies, dModule) => {
    if (dModuleDependencies.indexOf(pkg) !== -1) {
      dependentModules.push(dModule);
    }
  });

  return dependentModules;
}

/**
 * Returns a map of the packages that this repository manages (so no packages found through the workspaces who's path contains ../ )
 * @param rootPath
 */
function getLocalLincdPackageMap(rootPath = './'): Map<string, PackageDetails> {
  let map = new Map();
  getLincdPackages(rootPath).forEach((pkg) => {
    if (pkg.path.indexOf('../') === -1 && pkg.path.indexOf('..\\') === -1) {
      // console.log(package.path);
      map.set(pkg.packageName, pkg);
    }
  });
  return map;
}

function getLocalLincdModules(rootPath = './'): PackageDetails[] {
  return getLincdPackages(rootPath).filter((pkg) => {
    return pkg.path.indexOf('..\\') === -1;
  });
}

export function getLincdPackages(rootPath = process.cwd()): PackageDetails[] {
  let pack = getPackageJSON();
  if (!pack || !pack.workspaces) {
    for (let i = 0; i <= 3; i++) {
      rootPath = path.join(process.cwd(), ...Array(i).fill('..'));

      pack = getPackageJSON(rootPath);
      if (pack && pack.workspaces) {
        // log('Found workspace at '+packagePath);
        break;
      }
    }
  }

  if (!pack || !pack.workspaces) {
    warn(
      chalk.red(
        'Could not find package workspaces. Make sure you run this command from a yarn workspace.',
      ),
    );
    logHelp();
    process.exit();
  }
  // console.log(pack.workspaces);

  let res = [];
  checkWorkspaces(rootPath, pack.workspaces, res);
  return res;
}

function setVariable(name, replacement) {
  //prepare name for regexp
  name = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  variables[name] = replacement;
}

var replaceVariablesInFile = async (filePath: string) => {
  var fileContent = await fs.readFile(filePath, 'utf8').catch((err) => {
    console.warn(chalk.red('Could not read file ' + filePath));
  });
  if (fileContent) {
    var newContent = replaceCurlyVariables(fileContent);
    return fs.writeFile(filePath, newContent);
  } else {
    return Promise.resolve();
  }
};

var replaceCurlyVariables = function (string) {
  // var reg = new RegExp('\\$\\{'+key+'\\}','g');
  for (var key in variables) {
    string = string.replace(
      new RegExp('\\$\\{' + key + '\\}', 'g'),
      variables[key],
    );
  }
  return string;
};

const capitalize = (str) =>
  str.charAt(0).toUpperCase() + str.toLowerCase().slice(1);
const camelCase = (str) => {
  let string = str.replace(/[^A-Za-z0-9]/g, ' ').split(' ');
  if (string.length > 1) {
    return string.reduce((result, word) => result + capitalize(word));
  }
  return str;
};

export const createOntology = async (
  prefix,
  uriBase?,
  basePath = process.cwd(),
) => {
  if (!prefix) {
    console.warn('Please provide a suggested prefix as the first argument');
    return;
  }

  let sourceFolder = getSourceFolder(basePath);
  let targetFolder = ensureFolderExists(sourceFolder, 'ontologies');

  if (!uriBase) {
    uriBase = 'http://lincd.org/ont/' + prefix + '/';
  }
  setVariable('uri_base', uriBase);

  let {hyphenName, camelCaseName, underscoreName} = setNameVariables(prefix);

  //copy ontology accessor file
  log("Creating files for ontology '" + prefix + "'");
  let targetFile = path.join(targetFolder, hyphenName + '.ts');
  fs.copySync(
    path.join(
      __dirname,
      '..',
      'defaults',
      'package',
      'src',
      'ontologies',
      'example-ontology.ts',
    ),
    targetFile,
  );

  //copy data files
  let targetDataFile = path.join(
    targetFolder,
    '..',
    'data',
    hyphenName + '.json',
  );
  let targetDataFile2 = path.join(
    targetFolder,
    '..',
    'data',
    hyphenName + '.json.d.ts',
  );
  fs.copySync(
    path.join(
      __dirname,
      '..',
      'defaults',
      'package',
      'src',
      'data',
      'example-ontology.json',
    ),
    targetDataFile,
  );
  fs.copySync(
    path.join(
      __dirname,
      '..',
      'defaults',
      'package',
      'src',
      'data',
      'example-ontology.json.d.ts',
    ),
    targetDataFile2,
  );

  await replaceVariablesInFiles(targetFile, targetDataFile, targetDataFile2);
  log(
    `Prepared a new ontology data files in ${chalk.magenta(
      targetDataFile.replace(basePath, ''),
    )}`,
    `And an ontology accessor file in ${chalk.magenta(
      targetFile.replace(basePath, ''),
    )}`,
  );

  //if this is not a lincd app (but a lincd package instead)
  if (!sourceFolder.includes('frontend')) {
    //then also add an import to index
    let indexPath = addLineToIndex(
      `import './ontologies/${hyphenName}';`,
      'ontologies',
    );
    log(`Added an import of this file from ${chalk.magenta(indexPath)}`);
  }
};
const addLineToIndex = function (line, insertMatchString: string) {
  //import ontology in index
  let indexPath = ['index.ts', 'index.tsx']
    .map((f) => path.join('src', f))
    .find((indexFileName) => {
      return fs.existsSync(indexFileName);
    });
  if (indexPath) {
    let indexContents = fs.readFileSync(indexPath, 'utf-8');
    let lines = indexContents.split(/\n/g);
    let newContents;
    for (var key in lines) {
      if (lines[key].indexOf(insertMatchString) !== -1) {
        //remove lines after this line and insert new line in its place
        lines[key] += `\n${line}`;
        newContents = lines.join('\n');
        // log("Found at "+key,lines,newContents);
        break;
      }
    }
    if (!newContents) {
      newContents = indexContents + `\n${line}`;
      // log("Added at end",newContents);
    }
    fs.writeFileSync(indexPath, newContents);
  }
  return indexPath;
};
const replaceVariablesInFiles = function (...files: string[]) {
  return Promise.all(
    files.map((file) => {
      return replaceVariablesInFile(file);
    }),
  );
};
const replaceVariablesInFolder = function (folder: string) {
  //get all files in folder, including files that start with a dot

  glob(folder + '/**/*', {dot: true, nodir: true}, function (err, files) {
    if (err) {
      console.log('Error', err);
    } else {
      // console.log(files);
      return Promise.all(
        files.map((file) => {
          return replaceVariablesInFile(file);
        }),
      );
    }
  });
};

const replaceVariablesInFilesWithRoot = function (
  root: string,
  ...files: string[]
) {
  return replaceVariablesInFiles(...files.map((f) => path.join(root, f)));
};
const hasYarnInstalled = async function () {
  let version = (await execPromise('yarn --version').catch((err) => {
    console.log('yarn probably not working');
    return '';
  })) as string;
  return version.toString().match(/[0-9]+/);
};

const ensureFolderExists = function (...folders: string[]) {
  let target;
  folders.forEach((folder) => {
    target = target ? path.join(target, folder) : path.join(folder);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target);
    }
  });
  return target;
  /*let targetFolder = path.join(...folders);
  let parentDirectory = folders.slice(0, folders.length - 1);
  if (!fs.existsSync(targetFolder)) {
    if (fs.existsSync(path.join(...parentDirectory))) {
      fs.mkdirSync(targetFolder);
    } else {
      warn(
        `Please run this command from the root of your package. This command expects ${parentDirectory.toString()} to exists from that folder`,
      );
    }
  }
  return targetFolder;*/
};

export const setNameVariables = function (name) {
  let hyphenName = name.replace(/[-_\s]+/g, '-');
  let camelCaseName = camelCase(name); //some-package --> someModule
  let underscoreName = name.replace(/[-\s]+/g, '_');
  let plainName = name.replace(/[-\s]+/g, '');

  //longer similar variables names should come before the shorter ones
  setVariable('underscore_name', underscoreName);
  setVariable('hyphen_name', hyphenName);
  setVariable('camel_name', camelCaseName);
  setVariable('name', name);
  setVariable('plain_name', plainName);

  return {hyphenName, camelCaseName, underscoreName, plainName};
};

function getSourceFolder(basePath = process.cwd()) {
  //LINCD App
  if (fs.existsSync(path.join(basePath, 'frontend', 'src'))) {
    return path.join(basePath, 'frontend', 'src');
  }
  //LINCD package
  if (fs.existsSync(path.join(basePath, 'src'))) {
    return path.join(basePath, 'src');
  } else {
    console.warn('Cannot find source folder');
    return path.join(basePath, 'src');
  }
}

export const createShape = async (name, basePath = process.cwd()) => {
  let sourceFolder = getSourceFolder(basePath);
  let targetFolder = ensureFolderExists(sourceFolder, 'shapes');
  let {hyphenName, camelCaseName, underscoreName} = setNameVariables(name);

  //copy default shape file
  // log("Creating files for shape '" + name + "'");
  let targetFile = path.join(targetFolder, hyphenName + '.ts');
  fs.copySync(path.join(__dirname, '..', 'defaults', 'shape.ts'), targetFile);

  //replace variables in some of the copied files
  await replaceVariablesInFiles(targetFile);
  log(
    `Created a new shape class template in ${chalk.magenta(
      targetFile.replace(basePath, ''),
    )}`,
  );

  //if this is NOT a lincd app (but a lincd package)
  let indexPath;
  if (!sourceFolder.includes('frontend')) {
    indexPath = addLineToIndex(`import './shapes/${hyphenName}';`, 'shapes');
    log(`Added an import of this file from ${chalk.magenta(indexPath)}`);
  }
};

export const createSetComponent = async (name, basePath = process.cwd()) => {
  let targetFolder = ensureFolderExists(basePath, 'src', 'components');
  let {hyphenName, camelCaseName, underscoreName} = setNameVariables(name);

  //copy default shape file
  log("Creating files for set component '" + name + "'");
  let targetFile = path.join(targetFolder, hyphenName + '.tsx');
  fs.copySync(
    path.join(__dirname, '..', 'defaults', 'set-component.tsx'),
    targetFile,
  );

  let targetFile2 = path.join(targetFolder, hyphenName + '.scss');
  fs.copySync(
    path.join(__dirname, '..', 'defaults', 'component.scss'),
    targetFile2,
  );

  //replace variables in some of the copied files
  await replaceVariablesInFiles(targetFile, targetFile2);

  let indexPath = addLineToIndex(
    `import './components/${hyphenName}';`,
    'components',
  );

  log(
    `Created a new set component in ${chalk.magenta(
      targetFile.replace(basePath, ''),
    )}`,
    `Created a new stylesheet in ${chalk.magenta(
      targetFile2.replace(basePath, ''),
    )}`,
    `Added an import of this file from ${chalk.magenta(indexPath)}`,
  );
};
export const createComponent = async (name, basePath = process.cwd()) => {
  let sourceFolder = getSourceFolder(basePath);
  let targetFolder = ensureFolderExists(sourceFolder, 'components');
  let {hyphenName, camelCaseName, underscoreName} = setNameVariables(name);

  //copy default shape file
  log("Creating files for component '" + name + "'");
  let targetFile = path.join(targetFolder, hyphenName + '.tsx');
  fs.copySync(
    path.join(__dirname, '..', 'defaults', 'component.tsx'),
    targetFile,
  );

  let targetFile2 = path.join(targetFolder, hyphenName + '.scss');
  fs.copySync(
    path.join(__dirname, '..', 'defaults', 'component.scss'),
    targetFile2,
  );

  //replace variables in some of the copied files
  await replaceVariablesInFiles(targetFile, targetFile2);
  log(
    `Created a new component template in ${chalk.magenta(
      targetFile.replace(basePath, ''),
    )}`,
    `Created component stylesheet template in ${chalk.magenta(
      targetFile2.replace(basePath, ''),
    )}`,
  );

  //if this is not a lincd app (but a lincd package instead)
  if (!sourceFolder.includes('frontend')) {
    //then also add an import to index
    let indexPath = addLineToIndex(
      `import './components/${hyphenName}';`,
      'components',
    );
    log(`Added an import of this file from ${chalk.magenta(indexPath)}`);
  }
};

//read the source of all ts/tsx files in the src folder
//if there is an import that imports a lincd package with /src/ in it, then warn
//if there is an import that imports outside of the src folder, then warn
export const checkImports = async (
  sourceFolder: string = getSourceFolder(),
  depth: number = 0, // Used to check if the import is outside of the src folder
  invalidImports: Map<string, string[]> = new Map(),
) => {
  const dir = fs.readdirSync(sourceFolder);

  // Start checking each file in the source folder
  for (const file of dir) {
    const filename = path.join(sourceFolder, file);

    // File is either a directory, or not a .ts(x)
    // INFO: For future use - if this part fails, it could be due to user permissions
    //  i.e. the program not having access to check the file metadata
    if (!filename.match(/\.tsx?$/)) {
      if (statSync(filename).isDirectory()) {
        await checkImports(filename, depth + 1, invalidImports);
      }

      // Ignore all files that aren't one of the following:
      // - .ts
      // - .tsx
      continue;
    }

    const allImports = await getFileImports(filename);
    const lincdImports = allImports.filter(
      (i) => i.includes('lincd') || i.includes('..'),
    );

    lincdImports.forEach((i) => {
      if (!isValidLINCDImport(i, depth)) {
        if (!invalidImports.has(filename)) {
          invalidImports.set(filename, []);
        }

        invalidImports.get(filename).push(i);
      }
    });
  }

  // All recursion must have finished, display any errors
  if (depth === 0 && invalidImports.size > 0) {
    console.warn(chalk.red('\n' + 'Invalid imports found.  See fixes below:'));
    console.warn(
      chalk.red(
        " - For relative imports, ensure you don't import outside of the /src/ folder",
      ),
    );
    console.warn(
      chalk.red(
        ' - For lincd imports, access the /lib/ folder instead of /src/',
      ),
    );

    invalidImports.forEach((value, key) => {
      console.info(
        chalk.red('\nFound in file ') + chalk.blue(key) + chalk.red(':'),
      );
      value.forEach((i) => console.warn(chalk.red("- '" + i + "'")));
    });
    process.exit(1);
  } else if (depth === 0 && invalidImports.size === 0) {
    console.info('All imports OK');
    process.exit(0);
  }
};

export const depCheckStaged = async () => {
  console.log('Checking dependencies of staged files');
  stagedGitFiles(async function (err, results) {
    const packages = new Set<string>();
    await Promise.all(
      results.map(async (file) => {
        // console.log('STAGED: ', file.filename);
        let root = await findNearestPackageJson(file.filename);
        packages.add(root.path);
      }),
    );

    [...packages].forEach((packageRoot) => {
      const pack = JSON.parse(fs.readFileSync(packageRoot, 'utf8'));
      const srcPath = packageRoot.replace('package.json', '');
      console.log('Checking dependencies of ' + chalk.blue(pack.name) + ':');
      return depCheck(process.cwd() + '/' + srcPath);
      // console.log('check dependencies of ' + pack.name);
      //
      // console.log('ROOT of ' + file.filename + ': ' + root.path);
      // console.log('ROOT of ' + file.filename + ': ' + root.data);
    });
  });
};
export const depCheck = async (path: string = process.cwd()) => {
  depcheck(path, {}, (results) => {
    if (results.missing) {
      let lincdPackages = getLocalLincdModules();
      let missing = Object.keys(results.missing);
      //filter out missing types, if it builds we're not too concerned about that at the moment?
      //especially things like @types/react, @types/react-dom, @types/node (they are added elsewhere?)
      // missing = missing.filter(m => m.indexOf('@types/') === 0);
      //currently react is not an explicit dependency, but we should add it as a peer dependency
      missing.splice(missing.indexOf('react'), 1);

      let missingLincdPackages = missing.filter((missingDep) => {
        return lincdPackages.some((lincdPackage) => {
          return lincdPackage.packageName === missingDep;
        });
      });
      //currently just missing LINCD packages cause a hard failure exit code
      if (missingLincdPackages.length > 0) {
        console.warn(
          chalk.red(
            path +
              '\n[ERROR] These LINCD packages are imported but they are not listed in package.json:\n- ' +
              missingLincdPackages.join(',\n- '),
          ),
        );
        process.exit(1);
      } else if (missing.length > 0) {
        console.warn(
          chalk.magenta(
            path +
              '\nMissing dependencies (for now a warning, soon an error):\n\t' +
              missing.join(',\n\t'),
          ),
        );
      }
    }
    // if(Object.keys(results.invalidFiles).length > 0) {
    //   console.warn(chalk.red("Invalid files:\n")+Object.keys(results.invalidFiles).join(",\n"));
    // }
    // if(Object.keys(results.invalidDirs).length > 0) {
    //   console.warn(chalk.red("Invalid dirs:\n")+results.invalidDirs.toString());
    // }
    // if(results.unused) {
    //   console.warn("Unused dependencies: "+results.missing.join(", "));
    // }
  });
};
export const createPackage = async (
  name,
  uriBase?,
  basePath = process.cwd(),
) => {
  //if ran with npx, basePath will be the root directory of the repository, even if we're executing from a sub folder (the root directory is where node_modules lives and package.json with workspaces)
  //so we manually find a packages folder, if it exists we go into that.
  if (fs.existsSync(path.join(basePath, 'packages'))) {
    basePath = path.join(basePath, 'packages');
  }
  if (!name) {
    console.warn('Please provide a name as the first argument');
    return;
  }

  //let's remove scope for variable names
  let [packageName, scope, cleanPackageName] = name.match(
    /(@[\w\-]+\/)?([\w\-]+)/,
  );

  let targetFolder = ensureFolderExists(basePath, cleanPackageName);

  if (!uriBase) {
    uriBase = 'http://lincd.org/ont/' + name;
  }
  setVariable('uri_base', uriBase + '/');

  //find @scope and the next part between 2 slashes after
  //so @dacore/some-mod/lib/file.js
  // --> match[0] = @dacore/some-mod
  // --> match[1] = @dacore
  // --> match[2] = some-mod

  //but save full scoped package name under ${package_name}
  setVariable('package_name', name);

  //extra variable for clarity (will be same as 'name')
  setVariable('output_file_name', name);

  let {hyphenName, camelCaseName, underscoreName} =
    setNameVariables(cleanPackageName);

  log("Creating new LINCD package '" + name + "'");
  fs.copySync(path.join(__dirname, '..', 'defaults', 'package'), targetFolder);

  //replace variables in some of the copied files
  await Promise.all(
    [
      'src/index.ts',
      'package.json',
      'Gruntfile.js',
      'src/package.ts',
      'src/shapes/ExampleShapeClass.ts',
      'src/ontologies/example-ontology.ts',
      'src/data/example-ontology.json',
    ]
      .map((f) => path.join(targetFolder, f))
      .map((file) => {
        return replaceVariablesInFile(file);
      }),
  );

  //rename these to a file name similar to the pkg name
  [
    'src/ontologies/example-ontology.ts',
    'src/data/example-ontology.json',
    'src/data/example-ontology.json.d.ts',
  ].forEach((f) => {
    let parts = f.split('/');
    let newParts = [...parts];
    let [name, ...extensions] = newParts.pop().split('.');
    let newName = hyphenName + '.' + extensions.join('.');
    console.log(
      'rename ',
      path.join(targetFolder, f),
      path.join(targetFolder, ...newParts, newName),
    );
    fs.renameSync(
      path.join(targetFolder, f),
      path.join(targetFolder, ...newParts, newName),
    );
  });

  let version = (await execPromise('yarn --version').catch((err) => {
    console.log('yarn probably not working');
    return '';
  })) as string;
  let installCommand = version.toString().match(/[0-9]+/)
    ? 'yarn install'
    : 'npm install';
  await execp(
    `cd ${targetFolder} && ${installCommand} && npm exec lincd build`,
    true,
  ).catch((err) => {
    console.warn('Could not install dependencies');
  });

  log(
    `Prepared a new LINCD package in ${chalk.magenta(targetFolder)}`,
    `Run ${chalk.blueBright('yarn build')} from this directory to build once`,
    `Or ${chalk.blueBright(
      'yarn dev',
    )} to continuously rebuild on file changes`,
  );
};

var getNextVersion = function (version) {
  let parts = version.split('.');
  return parts[0] + '.' + parts[1] + '.' + (parseInt(parts[2]) + 1).toString();
};
var getNextMajorVersion = function (version) {
  let parts = version.split('.');
  return (parseInt(parts[0]) + 1).toString() + '.0.0';
};
var getNextMinorVersion = function (version) {
  let parts = version.split('.');
  return parts[0] + '.' + (parseInt(parts[1]) + 1).toString() + '.0';
};
var buildFailed = function (output: string) {
  return (
    output.indexOf('Aborted due to warnings') !== -1 &&
    output.indexOf('Command failed') !== -1
  );
};
/*program.command('shapes').action(async () => {
	//we've imported require-extensions from npm so that we can use this
	//we want to avoid nodejs tripping up over @import commands in css files
	require.extensions['.scss'] = function (sourcecode, filename) {
		return {};
	};
	require.extensions['.css'] = function (sourcecode, filename) {
		return {};
	};

	if (fs.existsSync(process.cwd() + '/package.json')) {
		var pack = JSON.parse(
			fs.readFileSync(process.cwd() + '/package.json', 'utf8'),
		);
		let packageName = pack.name;

		//just making sure the library is loaded in correct order because circular references are currently happening when importing BlankNode before NamedNode for example
		// require('lincd');
		//TODO: replace with actual index file from package.json, or tsconfig
		let indexExports = require(process.cwd() + '/lib/index.js');
		if(indexExports.packageExports)
		{
			let shapeJSONLD = await getShapesJSONLD(indexExports.packageExports);
			console.log(indexExports.packageExports);
			console.log(shapeJSONLD);
			console.log(chalk.bold(chalk.green(packageName+'/dist/shapes.json')));
			return fs.writeFile(path.join('dist', 'shapes.json'), shapeJSONLD);
		}
		else
		{
			console.warn("Invalid LINCD package. Index file should export a packageExports object. See examples.")
		}

	} else {
		console.warn('Not a project');
	}
});*/

export const register = function (registryURL) {
  if (fs.existsSync(process.cwd() + '/package.json')) {
    var pack = JSON.parse(
      fs.readFileSync(process.cwd() + '/package.json', 'utf8'),
    );
    let version = pack.version;
    let packageName = pack.name;
    // let author = pack.author;
    // let description = pack.description;
    //
    // let authorName = pack.author;
    // if (pack.author.name) {
    //   authorName = pack.author.name;
    // }

    console.log(
      chalk.cyan(
        'registering package ' +
          packageName +
          ' ' +
          version +
          ' in the LINCD registry',
      ),
    );

    return fetch(registryURL + '/register', {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({package: packageName, version}),
      // body: JSON.stringify({package: packageName, version, author}),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          console.log(chalk.red('Response: ' + json.error));
        } else if (json.result) {
          console.log(chalk.blueBright('Response: ') + json.result);
          if (json.warning) {
            console.log(chalk.red('Warning: ') + json.warning);
          }
        }
      })
      .catch((err) => {
        console.warn(
          chalk.red('Warning: ') + 'Could not connect to LINCD registry',
        );
      });
  } else {
    console.warn(
      chalk.red('Warning:') + ' not found: ' + process.cwd() + '/package.json',
    );
  }
};

export const buildPackage = (
  target,
  target2,
  packagePath = process.cwd(),
  logResults: boolean = true,
) => {
  if (target == 'production' || target == 'es5' || target == 'es6' || !target) {
    if (!fs.existsSync(path.join(packagePath, 'Gruntfile.js'))) {
      console.warn(
        `No Gruntfile found at ${packagePath}\\Gruntfile.js. Cannot build.`,
      );
      return;
    }

    var nodeEnv = '';
    if (target == 'production') {
      if (
        !(target2 == 'es5' || target2 == 'es6' || typeof target2 == 'undefined')
      ) {
        console.warn('unknown second build target. Use es5 or es6', target2);
        return;
      }
      var isWindows = /^win/.test(process.platform);
      if (isWindows) {
        nodeEnv = 'SET NODE_ENV=production&& ';
      } else {
        nodeEnv = "NODE_ENV='production' ";
      }
    }
    if (!target) {
      target = 'es6';
    }

    log(
      'building once: ' +
        nodeEnv +
        'grunt build' +
        (target ? '-' + target : '') +
        (target2 ? '-' + target2 : '') +
        ' --color',
    );
    let method = logResults ? execp : execPromise;

    //NOTE: we moved SCSS:JSON out of webpack and grunt, into this file
    //this is the beginning of a transition away from grunt
    //but for the time being it's perhaps a bit strange that we
    // let x = postcss([
    //   postcssModules({
    //     generateScopedName,
    //   }),
    // ]);

    //execute the command to build the method, and provide the current work directory as option
    return method(
      nodeEnv +
        'grunt build' +
        (target ? '-' + target : '') +
        (target2 ? '-' + target2 : '') +
        ' --color',
      false,
      false,
      {cwd: packagePath},
    ).catch((err) => {
      process.exit(1);
    });
  } else {
    console.warn('unknown build target. Use es5, es6 or production.');
  }
};

export var publishUpdated = function (test: boolean = false) {
  let packages = getLocalLincdModules();

  var p: Promise<any> = Promise.resolve('');
  let packagesLeft = packages.length;
  let results = [];
  log(
    'Checking which packages need to be published by comparing last published date with last git commit',
  );
  // p = Promise.all(packages.map((pckg) => {
  packages.forEach((pckg) => {
    p = p
      .then((previousResult) => {
        // progressUpdate(packagesLeft-- + ' packages left. Now checking ' + pckg.packageName);
        log('# Checking package ' + pckg.packageName);
        // log('# Requesting ' + 'yarn info '+pkg.packageName+' --json');
        // return execPromise('yarn info '+pkg.packageName+' --json').then((output:string) => {
        // console.log("Will be requesting npm view from this current working directory:\n"+process.cwd());
        // return execPromise('npm view '+pkg.packageName+' --json').then((output:string) => {

        let shouldPublish;
        var pack = getPackageJSON(pckg.path);
        let version = getNextVersion(pack.version);
        if (pack.private) {
          shouldPublish = false;
          debugInfo(chalk.blue('--> is private, skipping'));

          return chalk.gray(pckg.packageName + ' is private');
          // return previousResult + ' ' + chalk.gray(pckg.packageName + ' is private\n');
        }
        console.log('testing npm');
        return execPromise('npm info ' + pckg.packageName + ' --json')
          .then(async (output: string) => {
            console.log('testing npm done');
            var info;
            try {
              if (output == '' || output.includes('E404')) {
                debugInfo(
                  'Empty or 404 response from `npm info`. This package was probably not published before',
                );
                // throw new Error('Empty response from `yarn info`. This pkg was probably not published before');
                // return;
                shouldPublish = true;
                //don't patch the version number (default, see above), use the current version
                version = pack.version;
              } else {
                info = JSON.parse(output);
              }

              if (info) {
                let lastPublish;
                //yarn:
                // let lastPublish = info.data.time[info.data.version];
                lastPublish = info.time[info.version];
                // }
                // catch (e) {
                //   console.log(info);
                //   console.error(chalk.red("Could not parse response from npm info. Format may have changed?"));
                //   process.exit();
                // }

                let lastPublishDate = new Date(lastPublish);
                // let {lastModifiedTime, lastModifiedName, lastModified} = getLastModifiedSourceTime(pkg.path);
                let lastCommitInfo = await getLastCommitTime(pckg.path);
                if (!lastCommitInfo) {
                  shouldPublish = false;
                  debugInfo('Could not determine last git commit');
                  // return previousResult + ' ' + chalk.red(pckg.packageName + ' - could not determine last commit\n');
                  return chalk.red(
                    pckg.packageName + ' - could not determine last commit',
                  );
                } else {
                  //NOTE: removed lastModified, because switching branches will say that the file was modified and cause everything to publish
                  //SO: now you NEED TO commit before it picks up that you should publish
                  shouldPublish =
                    lastPublishDate.getTime() < lastCommitInfo.date.getTime();

                  //ignore changes to package.json if that's the only change, because when we publish the version number changes, which is then committed
                  //(note there is always 2 lines for commit info + number of files changed)
                  let changedFiles = lastCommitInfo.changes
                    .split('\n')
                    .filter((line) => line.includes('|'));
                  let numberOfFilesChanges = changedFiles.length;
                  // console.log("CHECK "+lastCommitInfo.changes.includes("package.json")+" - "+numberOfFilesChanges)
                  if (
                    shouldPublish &&
                    lastCommitInfo.changes.includes('package.json') &&
                    numberOfFilesChanges === 1
                  ) {
                    shouldPublish = false;
                  }
                  if (shouldPublish) {
                    log(
                      chalk.magenta(pckg.packageName) +
                        ' should be published because:',
                    );
                    log(
                      lastPublishDate.toDateString() +
                        ' ' +
                        lastPublishDate.toTimeString() +
                        ' published ' +
                        info.version,
                    );
                    log(
                      lastCommitInfo.date.toDateString() +
                        ' ' +
                        new Date(lastCommitInfo.date).toTimeString() +
                        ' source last committed:',
                    );
                    log(lastCommitInfo.changes);
                  }
                }
              }
            } catch (err) {
              // var stats = fs.statSync(path.join(packageDirectory));
              // var files = fs.readdirSync(path.join(packageDirectory,'src'));
              console.log(
                chalk.red(pckg.packageName + ' failed: ' + err.message + '\n'),
              );
              console.warn('Returned JSON from npm: ' + output);
              // return previousResult + ' ' + chalk.red(pckg.packageName + ' failed: ' + err.message + '\n');
              return chalk.red(pckg.packageName + ' failed: ' + err.message);
            }
            if (shouldPublish) {
              return publishPackage(pckg, test, info, version);
            }
            return (
              chalk.blue(pckg.packageName) + ' latest version is up to date'
            );
          })
          .catch(({error, stdout, stderr}) => {
            if (error) {
              console.log(error.message);
            }
            if (stdout) {
              console.log(stderr);
            }
            if (stderr) {
              console.log(stderr);
            }
            // return previousResult + ' ' + chalk.red(pckg.packageName + ' failed\n');
            console.warn(chalk.red(pckg.packageName + ' failed'));
            return chalk.red(pckg.packageName + ' failed');
          });
      })
      .then((res) => {
        log(res);
        results.push(res);
      })
      .catch((err) => {
        console.warn(
          chalk.red(pckg.packageName + ' failed: ' + err.toString()),
        );
        results.push(
          chalk.red(pckg.packageName + ' failed: ' + err.toString()),
        );
      });
  });
  return p.then(() => {
    // if (messages == '')
    // {
    //   console.log('All published packages are already up-to-date.');
    // }
    // else
    // {
    console.log(
      'Summary:                                \n' + results.join('\n'),
    );
    // }
  });
};

async function getEnvJsonPath(relativeToPath = process.cwd()) {
  let path = '';
  if (!relativeToPath.endsWith('/')) {
    relativeToPath += '/';
  }
  // let path = './';
  for (let i = 0; i <= 10; i++) {
    let envFile = await getEnvFile({
      filePath: relativeToPath + path + '.env.json',
    }).catch((err) => {
      return null;
    });
    if (envFile) {
      //note: we're getting the actual contents here, so we could also use that more directly?
      return path + '.env.json';
    }
    path += '../';
  }
}

export var publishPackage = async function (
  pkg?,
  test?,
  info?,
  publishVersion?,
) {
  if (!pkg) {
    let localPackageJson = getPackageJSON();
    pkg = {
      path: process.cwd(),
      packageName: localPackageJson.name,
    };
  }
  if (!publishVersion) {
    publishVersion = info ? getNextVersion(info.version) : 'patch';
  }
  if (test) {
    debugInfo('should publish ' + pkg.packageName + ' ' + publishVersion);
    //when testing what needs to be published
    return chalk.blue(pkg.packageName + ' should publish');
  }
  console.log(
    chalk.blue('publishing ' + pkg.packageName + ' ' + publishVersion),
  );

  //looking for an .env.json file in our workspace, which may store our NPM AUTH key
  let envJsonPath = await getEnvJsonPath(pkg.path);

  return execPromise(
    `cd ${pkg.path} && ${
      envJsonPath ? `env-cmd -f ${envJsonPath} --use-shell "` : ''
    }yarn version ${publishVersion} && yarn npm publish${
      envJsonPath ? `"` : ''
    }`,
    true,
    false,
    {},
    true,
  )
    .then((res) => {
      if (
        res.indexOf('Aborted due to warnings') !== -1 ||
        res.indexOf('Could not publish') !== -1 ||
        res.indexOf("Couldn't publish") !== -1
      ) {
        console.log(res);
        return chalk.red(pkg.packageName + ' failed\n');
      }

      console.log(
        'Successfully published ' +
          chalk.green(pkg.path) +
          ' ' +
          chalk.magenta(publishVersion),
      );
      return (
        chalk.green(pkg.packageName) +
        ' published ' +
        chalk.magenta(publishVersion)
      );
    })
    .catch(({error, stdout, stderr}) => {
      console.log(chalk.red('Failed to publish: ' + error.message));
      return chalk.red(pkg.packageName + ' failed to publish');
    });
};

export var buildUpdated = async function (
  back,
  target,
  target2,
  useGitForLastModified: boolean = false,
  test: boolean = false,
) {
  // back = back || 1;
  // return execPromise(`git log -${back} --format=%ci`).then((result) => {
  // let now = new Date();
  let previousResult = '';
  log(
    test
      ? 'Checking which packages need to be rebuild'
      : 'Building updated packages',
  );
  // let packages = getLocalLincdModules();
  let packages = getLocalLincdPackageMap();

  // console.log(packages);
  let jsonldPkgUpdated = await needsRebuilding(
    packages.get('lincd-jsonld'),
    useGitForLastModified,
  );
  // let cliPkgUpdated = await needsRebuilding(packages.get('lincd-cli'), useGitForLastModified);

  //if either cli or jsonldPkg needs to be rebuilt
  // if (jsonldPkgUpdated || cliPkgUpdated) {
  if (jsonldPkgUpdated) {
    await execPromise(
      'yarn exec tsc && echo "compiled lincd-jsonld"',
      false,
      false,
      {
        cwd: packages.get('lincd-jsonld').path,
      },
      true,
    );
    // await execPromise('yarn build-core', false, false, {}, true);
  }
  let rebuildAllModules = false;
  // if (cliPkgUpdated) {
  //   rebuildAllModules = true;
  //   log(chalk.magenta('Rebuilding all packages because the build tools (lincd-cli) got updated'));
  // }

  let packagesLeft = packages.size;
  runOnPackagesGroupedByDependencies(
    packages,
    (packageGroup, dependencies) => {
      debugInfo(
        'Now checking: ' + chalk.blue(packageGroup.map((i) => i.packageName)),
      );
      debugInfo(packagesLeft + ' packages left.');

      packagesLeft = packagesLeft - packageGroup.length;
      return async (pkg: PackageDetails) => {
        // debugInfo('# Checking package ' + pkg.packageName);
        let needRebuild = await needsRebuilding(
          pkg,
          useGitForLastModified,
          // true,
        );

        if (pkg.packageName === 'lincd-jsonld' && jsonldPkgUpdated) {
          needRebuild = true;
        }
        if (needRebuild || rebuildAllModules) {
          //TODO: when building a pkg, also rebuild all packages that depend on this package.. and iteratively build packages that depend on those packages..

          // log(packageName+' modified since last commit on '+now.toString());

          if (test) {
            debugInfo('Need to build ' + pkg.packageName);
            return chalk.blue(pkg.packageName + ' should be build');
          }
          log('Building ' + pkg.packageName);
          return execPromise(
            'cd ' +
              pkg.path +
              ' && yarn build' +
              (target ? ' ' + target : '') +
              (target2 ? ' ' + target2 : ''),
          )
            .then((res) => {
              debugInfo(chalk.green(pkg.packageName + ' successfully built'));
              return chalk.green(pkg.packageName + ' built');
            })
            .catch(({error, stdout, stderr}) => {
              warn(chalk.red('Failed to build ' + pkg.packageName));
              console.log(stdout);
              process.exit(1);
              // let dependentModules = getDependentPackages(dependencies, pkg);
              // if (dependentModules.length > 0) {
              //   // printBuildResults(failedModules, done);
              //   warn(chalk.red(pkg.packageName + ' build failed'));
              //   warn(
              //     'Stopping build-updated process because ' +
              //       dependentModules.length +
              //       ' other packages depend on this package.\n',
              //   ); //"+dependentModules.map(d => d.packageName).join(", ")));
              // }
            });
        }
      };
    },
    (results) => {
      if (results.length) {
        log('Summary:');
        log(results.join('\n'));
      } else {
        log(chalk.green('Nothing to rebuild'));
      }
    },
  );

  return;
};

const printBuildResults = function (failed, done) {
  log(
    'Successfully built: ' +
      chalk.green([...done].map((m) => m.packageName).join(', ')) +
      '\n',
  );
  if (failed.length > 0) {
    warn('Failed to build: ' + chalk.red(failed.join(', ')) + '\n');
  }
};

export var executeCommandForEachPackage = function (
  packages,
  command,
  filterMethod,
  filterValue,
) {
  //if a specific set of packages is given
  if (filterMethod == 'exclude') {
    //filter packages, so that we only execute on the packages as provided in the command
    log('Excluding ' + filterValue);
    filterValue = filterValue.split(',');
    packages = packages.filter(
      (pkg) => filterValue.indexOf(pkg.packageName) === -1,
    );
  }
  let startFrom: string;
  //by default start executing, unless 'from' is given
  let executing: boolean = true;
  //option to start from a specific pkg in the stack
  if (filterMethod == 'from') {
    startFrom = filterValue;
    if (startFrom) {
      console.log(chalk.blue('Will skip ahead to ' + startFrom));
    }
    let seen = false;
    packages = packages.filter((pkg) => {
      if (
        !seen &&
        (pkg.packageName == startFrom || pkg.packageName == startFrom)
      ) {
        seen = true;
      }
      return seen;
    });
  }

  log(
    "Executing '" +
      chalk.blueBright(command) +
      "' on packages " +
      chalk.magenta(packages.map((m) => m.packageName).join(', ')),
  );

  var p = Promise.resolve(true);
  packages.forEach((pkg) => {
    p = p.then(() => {
      log('# Package ' + chalk.magenta(pkg.packageName));
      return execp('cd ' + pkg.path + ' && ' + command);
    });
  });
  return p;
};

var gitIgnore = function (...entries) {
  //add each entry to the .gitignore file
  let gitIgnorePath = path.resolve(process.cwd(), '.gitignore');
  addLinesToFile(gitIgnorePath, entries);
};
export var addLinesToFile = function (filePath, entries) {
  let fileContents = fs.readFileSync(filePath, {encoding: 'utf8'});
  entries.forEach((entry) => {
    fileContents += '\n' + entry;
  });
  fs.writeFileSync(filePath, fileContents);
};
export var addCapacitor = async function (basePath = process.cwd()) {
  let targetFolder = ensureFolderExists(basePath);

  log('Adding capacitor');
  fs.copySync(
    path.join(__dirname, '..', 'defaults', 'app-static'),
    targetFolder,
  );
  fs.copySync(
    path.join(__dirname, '..', 'defaults', 'capacitor', 'scripts'),
    path.join(targetFolder, 'scripts'),
  );

  //update .env-cmdrc.json file
  let envCmdPath = path.resolve(basePath, '.env-cmdrc.json');
  let envCmd = JSON.parse(fs.readFileSync(envCmdPath, {encoding: 'utf8'}));

  envCmd['app-main'] = {
    APP_ENV: true,
    OUTPUT_PATH: './web/assets',
    ASSET_PATH: './assets/',
    ENTRY_PATH: './src/index-static.tsx',
  };
  envCmd['app-local-android'] = {
    NODE_ENV: 'app',
    SITE_ROOT: 'http://10.0.2.2:4000',
  };
  envCmd['app-local-ios'] = {
    NODE_ENV: 'app',
    SITE_ROOT: 'http://localhost:4000',
  };

  fs.writeFile(envCmdPath, JSON.stringify(envCmd, null, 2));
  log('Edited .env-cmdrc.json');

  gitIgnore(
    'android/app/build',
    'android/**/capacitor.build.gradle',
    'ios/App/App/public',
  );

  //update package.json scripts
  let pack = getPackageJSON(basePath);
  pack.scripts['build-staging'] =
    'env-cmd -e _main, staging node scripts/build.js';
  pack.scripts['fix-app'] = 'node scripts/fix-namespace.js';
  pack.scripts['app'] =
    'env-cmd -e _main,production,app-main node scripts/build.js && npx cap sync && yarn run fix-app';
  pack.scripts['app-local-ios'] =
    'env-cmd -e _main,development,app-main,app-local-ios node scripts/build.js && npx cap sync && yarn run fix-app';
  pack.scripts['app-local-android'] =
    'env-cmd -e _main,development,app-main,app-local-android node scripts/build.js && npx cap sync && yarn run fix-app';
  pack.scripts['cap:android'] = 'yarn cap open android';
  pack.scripts['cap:ios'] = 'yarn cap open ios';
  pack.scripts['cap:sync'] = 'yarn cap sync';

  fs.writeFile(
    path.resolve(basePath, 'package.json'),
    JSON.stringify(pack, null, 2),
  );
  log('Added new run script to package.json');

  await execPromise(`yarn add -D @capacitor/cli`, true, false, null, true);
  await execPromise(
    `yarn add @capacitor/android @capacitor/core @capacitor/app @capacitor/ios`,
    false,
    false,
    null,
    true,
  );

  // TODO: Do we need to add `npx cap init`? If yes, we should not copy capacitor config.ts yet
  // await execPromise(`npx cap init`, true, false, null, true);
  // got error:
  // [error] Non-interactive shell detected.
  // Run the command with --help to see a list of arguments that must be provided.
  // [error] Non-interactive shell detected.
  // Run the command with --help to see a list of arguments that must be provided.

  log(
    `Done! Now update your Capacitor configuration by providing an app name, app ID, and web directory at ${chalk.blue(
      'capacitor.config.ts',
    )}`,
  );
  log(
    `And then run ${chalk.magenta(
      'yarn cap add android',
    )} and/or ${chalk.magenta('yarn cap add ios')}')`,
  );
  log(
    `Last, run ${chalk.magenta('yarn app')} or ${chalk.magenta(
      'yarn app-local-ios',
    )} or ${chalk.magenta('yarn app-local-android')}`,
  );
};

export var executeCommandForPackage = function (packageName, command) {
  let packageDetails = getLincdPackages().find(
    (modDetails: PackageDetails) =>
      modDetails.packageName.indexOf(packageName) !== -1 ||
      modDetails.packageName.indexOf(packageName) !== -1,
  );
  if (packageDetails) {
    log(
      "Executing 'cd " +
        packageDetails.path +
        ' && yarn exec lincd' +
        (command ? ' ' + command : '') +
        "'",
    );

    return execp(
      'cd ' +
        packageDetails.path +
        ' && yarn exec lincd' +
        (command ? ' ' + command : ''),
    );
  } else {
    warn(
      "Could not find a pkg who's name (partially) matched " +
        chalk.cyan(packageName),
    );
  }
};
