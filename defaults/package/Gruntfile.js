var buildTools = require('lincd-cli');
module.exports = buildTools.generateGruntConfig('${package_name}', {
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  }, //list of non lincd modules that are already loaded and made globally available by one of the dependencies of this module
  //internals: [],//list of lincd modules that you want to INCLUDE in the bundle (as opposed to the module its own bundle being a dependency)
  //alias:{},//webpack alias -> maps on type of npm path to another
  //target:"es5"|"es6",
  //environment:"server"|"frontend",
  //outputPath:string,
  //es5Server:boolean
  //es5:{},//es5 specific config, use same properties as above
  //es6:{},//es6 specific config, use same properties as above
  //debug:false,//debug the build process
});
