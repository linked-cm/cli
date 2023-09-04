#!/usr/bin/env node
import {
  addCapacitor,
  buildAll,
  buildMetadata,
  buildPackage,
  buildUpdated,
  createApp,
  createComponent,
  createOntology,
  createPackage,
  createSetComponent,
  createShape,
  depCheck,
  developPackage,
  executeCommandForEachPackage,
  executeCommandForPackage,
  getLincdPackages,
  publishPackage,
  publishUpdated,
  register,
} from './cli-methods';

require('require-extensions');

var program = require('commander');
var fs = require('fs-extra');
var path = require('path');

program
  .command('create-app')
  .action((name) => {
    return createApp(name);
  })
  .description(
    'Creates a new folder with all the required files for a LINCD app',
  )
  .argument(
    '<name>',
    'the name of your LINCD app. To use spaces, wrap the name in double quotes.',
  );

program
  .command('create-package')
  .action((name, uriBase) => {
    return createPackage(name, uriBase);
  })
  .description(
    'Create a new folder with all the required files for a new LINCD package',
  )
  .argument(
    '<name>',
    'The name of the package. Will be used as package name in package.json',
  )
  .argument(
    '[uri_base]',
    'The base URL used for data of this package. Leave blank to use the URL of your package on lincd.org after you register it',
  );

program
  .command('create-shape')
  .action((name, uriBase) => {
    return createShape(name);
  })
  .description(
    'Creates a new ShapeClass file for your package. Execute this from your package folder.',
  )
  .argument(
    '<name>',
    'The name of the shape. Will be used for the file name and the class name',
  );

program
  .command('create-component')
  .action((name, uriBase) => {
    return createComponent(name);
  })
  .description(
    'Creates a new Component file for your package. Execute this from your package folder.',
  )
  .argument(
    '<name>',
    'The name of the component. Will be used for the file name and the export name',
  );

program
  .command('create-set-component')
  .action((name, uriBase) => {
    return createSetComponent(name);
  })
  .description(
    'Creates a new SetComponent file for your package. Execute this from your package folder.',
  )
  .argument(
    '<name>',
    'The name of the component. Will be used for the file name and the export name',
  );

program
  .command('create-ontology')
  .action((prefix, uriBase) => {
    return createOntology(prefix, uriBase);
  })
  .description(
    'Creates a new ontology file for your package. Execute this from your package folder.',
  )
  .argument(
    '<suggested-prefix>',
    'The suggested prefix for your ontology. Also the shorthand code used for the file name and the exported ontology object',
  )
  .argument(
    '[uribase]',
    "Optional argument to set the URI base for the URI's of all entities in your ontology. Leave blank to use the URI's provided by lincd.org once you register this package",
  );

program.command('app [action]', {hidden: true}).action(() => {
  register('http://localhost:4101');
});
program.command('register-local', {hidden: true}).action(() => {
  register('http://localhost:4101');
});
program.command('register-dev', {hidden: true}).action(() => {
  register('https://dev-registry.lincd.org');
});
program
  .command('register')
  .action(() => {
    register('https://registry.lincd.org');
  })
  .description(
    'Register (a new version of) this package to the LINCD registry. If successful your package will appear on www.lincd.org',
  );

program
  .command('info')
  .action(() => {
    var ownPackage = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
    );
    console.log(ownPackage.version);
    console.log('Running from: ' + __dirname);
  })
  .description(
    "Log the version of this tool and the path that it's running from",
  );

program
  .command('build [target] [target2]', {isDefault: true})
  .action((target, target2) => {
    buildPackage(target, target2);
  });

program.command('build-metadata').action(() => {
  buildMetadata();
});
program.command('publish-updated').action(() => {
  return publishUpdated();
});
program.command('publish [version]').action((version) => {
  return publishPackage(null, false, null, version);
});

program.command('status').action(() => {
  //log which packages need to be published
  return publishUpdated(true).then(() => {
    //log which packages need to be build
    return buildUpdated(undefined, '', '', true);
  });
});
program
  .command('build-updated [target] [target2]')
  .action((target, target2) => {
    return buildUpdated(1, target, target2);
  });
program
  .command('build-updated-since [num-commits-back] [target] [target2]')
  .action((back, target, target2) => {
    return buildUpdated(back, target, target2);
  });
program
  .command('build-all')
  .action((options) => {
    buildAll(options);
  })
  .option(
    '--sync',
    'build each package 1 by 1 - use this if you have build issues due to low available RAM memory',
  )
  .option('--from <char>', 'start from a specific package');

program
  .command('all [action] [filter] [filter-value]')
  .action((command, filter, filterValue) => {
    executeCommandForEachPackage(
      getLincdPackages(),
      command,
      filter,
      filterValue,
    );
  });
// program.command('all-except [excludedSpaces] [action]').action((excludedSpaces, command) => {
//   executeCommandForEachModule(getLincdModules(), command, null, excludedSpaces);
// });

program.command('dev [target] [mode]').action((target, mode) => {
  developPackage(target, mode);
});

program.command('depcheck').action((target, mode) => {
  depCheck();
});

program
  .command('package')
  .action((name, command, args: string[]) => {
    let fullCommand = command
      ? command +
        ' ' +
        ' ' +
        args
          .slice(0, 3)
          .filter((a) => a && true)
          .join(' ')
      : null;

    executeCommandForPackage(name, fullCommand);
  })
  .alias('p')
  .alias('pkg')
  .alias('m')
  .alias('module')
  .description(
    'Searches for a package in this workspace with a partially matching name and executes a command for that package (without needing to execute it from the folder of the package)',
  )
  .argument('<name>', 'the name of the package. Can be a part of the name.')
  .argument(
    '[command]',
    'the lincd command you want to execute. Like dev or build',
  )
  .argument('[args...]', 'the additional arguments of that command');

program.command('enable-capacitor').action(() => {
  addCapacitor();
});

program.parse(process.argv);
