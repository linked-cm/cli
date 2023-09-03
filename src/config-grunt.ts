import {generateWebpackConfig} from './config-webpack';
import {ModuleConfig} from './interfaces';
import {debug, flatten, generateScopedName, log, warn} from './utils';

const fs = require('fs');
const chalk = require('chalk');
const path = require('path');

declare var __dirname: string;
declare var require: any;

export default function generateGruntConfig(
  moduleName,
  config: ModuleConfig = {},
) {
  return function (grunt) {
    setupGrunt(grunt, moduleName, config);
  };
}

function setupGrunt(grunt, moduleName, config: ModuleConfig) {
  var buildServer =
    !config.environment ||
    config.environment == 'nodejs' ||
    config.environment == 'polymorphic';
  var buildFrontend =
    !config.environment ||
    config.environment == 'browser' ||
    config.environment == 'polymorphic';

  //when not specified and we ARe building frontend OR we are compiling the server for es5.. or if simply specified, then es5 is targeted
  var targetES5 =
    (!config.target && (buildFrontend || config.es5Server)) ||
    config.target == 'es5';
  var targetES6 = !config.target || config.target == 'es6';
  var targets = [];
  if (targetES5) targets.push('es5');
  if (targetES6) targets.push('es6');

  var targetLog = 'building ' + targets.join(', ');
  if (buildServer && !buildFrontend) {
    log(targetLog + ' lib only');
  } else if (!buildServer && buildFrontend) {
    log(targetLog + ' dist bundles only');
  } else if (buildServer && buildFrontend) {
    if (config.es5Server) {
      log(targetLog + ' lib files & dist bundles');
    } else {
      log(targetLog + ' dist bundles and es6 lib files');
    }
  } else {
    log('invalid configuration combination');
  }
  require('load-grunt-tasks')(grunt);

  //defaults
  grunt.registerTask('default', ['prepare-build', 'concurrent:dev']);
  grunt.registerTask(
    'dev',
    targetES6 ? ['prepare-build', 'dev-es6'] : ['prepare-build', 'dev-es5'],
  );
  grunt.registerTask(
    'build',
    targets.map((target) => 'build-' + target),
  );
  if (buildFrontend) {
    grunt.registerTask('build-frontend', [
      'prepare-build',
      ...targets.map((target) => 'webpack:build-' + target),
    ]);
  }

  grunt.registerTask(
    'build-production',
    flatten([
      'clean:lib',
      'prepare-build',
      buildFrontend ? targets.map((target) => 'webpack:prod-' + target) : null,
      buildServer ? ['exec:build-lib', 'copy:lib'] : null,
    ]),
  );

  let prepareBuild = ['postcss:cssjson'];
  if (config.beforeBuildCommand) {
    prepareBuild.push('exec:beforeBuildCommand');
  }

  //specific tasks
  grunt.registerTask('prepare-build', prepareBuild);
  grunt.registerTask('dev-es6-production', [
    'prepare-build',
    'concurrent:dev-prod',
  ]);
  grunt.registerTask('dev-es6', ['prepare-build', 'concurrent:dev']);
  grunt.registerTask('dev-es5', ['prepare-build', 'concurrent:dev-es5']);

  //build-es5 is by default just the frontend because the server is es6
  //however some specific modules (like @dacore/module) require the typescript compiler ('build-lib') to run for es5
  //so that core-es5 or browser-core-es5 can internalise its files
  //this can by triggered with es5Server
  grunt.registerTask(
    'build-es5',
    flatten([
      'postcss',
      buildFrontend ? 'webpack:build-es5' : null,
      config.es5Server ? ['exec:build-lib-es5', 'copy:lib'] : null,
    ]),
  );

  grunt.registerTask(
    'build-es6',
    flatten([
      'prepare-build',
      buildFrontend ? 'webpack:build-es6' : null,
      buildServer
        ? ['clean:lib', 'exec:build-lib', 'copy:lib', 'exec:depcheck']
        : null,
      // 'exec:shapes',
    ]),
  );

  grunt.registerTask('build-lib', [
    'prepare-build',
    'exec:build-lib',
    'copy:lib',
  ]);
  grunt.registerTask('build-production-es5', [
    'prepare-build',
    'webpack:prod-es5',
    // 'exec:shapes',
  ]);
  grunt.registerTask('build-production-es6', [
    'prepare-build',
    'webpack:prod-es6',
    // 'exec:shapes',
  ]);

  // log('setting grunt config');
  grunt.initConfig({
    exec: {
      'build-lib': 'yarn exec tsc --pretty',
      'build-lib-es5': 'yarn exec tsc --pretty -p tsconfig-es5.json',
      beforeBuildCommand: config.beforeBuildCommand,
      'server-dev': 'tsc -w',
      depcheck: 'yarn lincd depcheck',
      test: 'tsc -w',
      // shapes: 'lincd shapes',
      'css-declarations': 'tcm -p **/*.scss',
      'postcss-modules':
        'yarn postcss --use postcss-import postcss-nested postcss-modules -o build/draft.css -i scss/*',
    },
    copy: {
      lib: {
        files: [
          // copy json files in src over to lib
          {
            expand: true,
            src: ['**/*.json', '**/*.d.ts', '**/*.scss', '**/*.css'],
            dest: 'lib/',
            cwd: 'src/',
            filter: 'isFile',
          },
        ],
      },
    },
    postcss: {
      options: {
        map: true, // inline sourcemaps
        processors: [require('postcss-modules')({generateScopedName})],
        syntax: require('postcss-scss'), //for accepting comments
        writeDest: false,
      },
      cssjson: {
        src: 'src/**/*.scss',
      },
    },
    clean: {
      lib: ['lib/'],
    },
    concurrent: {
      dev: flatten([
        buildFrontend ? 'webpack:dev' : null,
        buildServer ? 'exec:server-dev' : null,
        // buildServer ? 'watch:css-module-transforms' : null,
        // 'exec:css-declarations-watch'
      ]),
      'dev-prod': flatten([
        buildFrontend ? 'webpack:dev-prod' : null,
        buildServer ? 'exec:server-dev' : null,
        // buildServer ? 'watch:css-module-transforms' : null,
        // 'exec:css-declarations-watch'
      ]),
      'dev-es5': flatten([
        buildFrontend ? 'webpack:dev-es5' : null,
        buildServer ? 'exec:server-dev' : null,
        // buildServer ? 'watch:css-module-transforms' : null,
        // 'exec:css-declarations-watch'
      ]),
      options: {
        logConcurrentOutput: true,
        logTaskName: 3,
        logBlacklist: [],
      },
    },
    webpack: {
      options: {
        stats: {
          chunks: false,
          version: false,
          // warningsFilter: (warning) => {
          //   return warning.indexOf('There are multiple modules') !== -1;
          // },
        },
      },
      dev: generateWebpackConfig(
        'dev',
        moduleName,
        (<any>Object).assign(
          {
            target: 'es6',
            watch: true,
          },
          config,
          config.es6,
          config.dev,
        ),
      ),
      'dev-prod': generateWebpackConfig(
        'dev',
        moduleName,
        (<any>Object).assign(
          {
            target: 'es6',
            watch: true,
            productionMode: true,
          },
          config,
          config.es6,
          config.prod,
        ),
      ),
      'dev-es5': generateWebpackConfig(
        'dev-es5',
        moduleName,
        (<any>Object).assign(
          {
            target: 'es5',
            watch: true,
          },
          config,
          config.es5,
          config.dev,
        ),
      ),
      'build-es6': generateWebpackConfig(
        'build-es6',
        moduleName,
        (<any>Object).assign(
          {
            target: 'es6',
            watch: false,
          },
          config,
          config.es6,
          config.dev,
        ),
      ),
      'build-es5': generateWebpackConfig(
        'build-es5',
        moduleName,
        (<any>Object).assign(
          {
            target: 'es5',
            watch: false,
          },
          config,
          config.es5,
          config.dev,
        ),
      ),
      'prod-es5': generateWebpackConfig(
        'prod-es5',
        moduleName,
        (<any>Object).assign(
          {
            target: 'es5',
            watch: false,
            productionMode: true,
          },
          config,
          config.es5,
          config.prod,
        ),
      ),
      'prod-es6': generateWebpackConfig(
        'prod-es6',
        moduleName,
        (<any>Object).assign(
          {
            target: 'es6',
            watch: false,
            productionMode: true,
          },
          config,
          config.es6,
          config.prod,
        ),
      ),
    },
  });

  //load the npm grunt task modules
  [
    'grunt-webpack',
    'grunt-exec',
    'grunt-concurrent',
    'grunt-contrib-clean',
    'grunt-contrib-copy',
    '@lodder/grunt-postcss',
  ].forEach((taskName) => {
    debug(config, 'loading grunt task ' + taskName);
    let localPath = path.resolve(
      __dirname,
      '..',
      'node_modules',
      taskName,
      'tasks',
    );
    let localPath2 = path.resolve(
      __dirname,
      '..',
      '..',
      'node_modules',
      taskName,
      'tasks',
    );
    let workspacePath = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'node_modules',
      taskName,
      'tasks',
    );
    let nestedWorkspacePath = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'node_modules',
      taskName,
      'tasks',
    );
    if (fs.existsSync(localPath)) {
      // grunt.loadNpmTasks(taskName);
      debug('Loading from ' + localPath);
      grunt.task.loadTasks(localPath);
    } else if (fs.existsSync(localPath2)) {
      // grunt.loadNpmTasks(taskName);
      debug('Loading from ' + localPath2);
      grunt.task.loadTasks(localPath2);
    } else if (fs.existsSync(workspacePath)) {
      //windows, so it seems
      debug('Loading from ' + workspacePath);
      grunt.task.loadTasks(workspacePath);
    } else if (fs.existsSync(nestedWorkspacePath)) {
      //mac / linux
      debug('Loading from ' + nestedWorkspacePath);
      grunt.task.loadTasks(nestedWorkspacePath);
    } else {
      warn(`Could not load grunt task module ${taskName}
Could not find task at any of these paths:
${localPath}
${localPath2}
${workspacePath}
${nestedWorkspacePath}`);
    }
  });
}
