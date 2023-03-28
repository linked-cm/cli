// WebpackWatchRunPlugin.js
/*
 * This simple webpack plugin helps to identify the list of file changes, that
 * triggered webpack re-compilation/re-build
 */
'use strict';

class WatchRunPlugin {
  apply(compiler) {
    compiler.hooks.watchRun.tap('WatchRun', (comp) => {
      const changedTimes = comp.watchFileSystem.watcher.mtimes;
      const changedFiles = Object.keys(changedTimes)
        .map((file) => `\n  ${file}`)
        .join('');
      if (changedFiles.length) {
        console.log('====================================');
        console.log('NEW BUILD FILES CHANGED:', changedFiles);
        console.log('====================================');
      }
    });
  }
}

/*class WebpackWatchRunPlugin {
	constructor(options?) {
		if (typeof options !== "object") options = {};
		this['options'] = options;
	}

	apply(compiler) {
		const options = this['options'];
		compiler.plugin("watch-run",
			function (watching, done) {
				const changedTimes = watching.compiler.watchFileSystem.watcher.mtimes;
				const changedFiles = Object.keys(changedTimes)
					.map(file => `\n  ${file}`)
					.join("");
				if (changedFiles.length) {
					console.log("Files modified:", changedFiles);
				}
				done();
			});
	}
}*/

export default WatchRunPlugin;
