'use strict';
const webpack = require('webpack');
const config = require('lincd-server/site.webpack.config');
const chalk = require('chalk');
const {buildMetadata} = require('lincd-cli/lib/cli-methods');

webpack(config, async (err, stats) => {
  if (err) {
    console.error(err.stack || err);
    if (err.details) {
      console.error(err.details);
    }
    process.exit(1);
    return;
  }
  const info = stats.toJson();
  if (stats.hasErrors()) {
    console.log('Finished running webpack with errors.');
    info.errors.forEach((e) => console.error(e));
  } else {

    console.log(
      stats.toString({
        chunks: false,
        assets: true,
        entryPoints: false,
        modules: false,
        moduleAssets: false,
        moduleChunks: false,
        colors: true,
      }),
    );
    // console.log(
    // 	chalk.green('\t'+Object.keys(stats.compilation.assets).join('\n\t')),
    // );

    //build metadata (JSON-LD files containing metadata about the lincd components, shapes & ontologies in this app or its packages)
    let updatedPaths = await buildMetadata();
    console.log(chalk.green("Updated metadata:\n")+" - "+updatedPaths.map(p => chalk.magenta(p.replace(process.cwd(),''))).join("\n - "));
  }
  process.exit();
});
