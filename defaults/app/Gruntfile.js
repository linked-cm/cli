var buildTools = require('lincd-cli');
module.exports = buildTools.generateGruntConfig('${hyphen_name}', {
  internals: '*', //for applications, we tell the bundler to bundle everything
  afterFirstBuildCommand: 'open index.html',
});
