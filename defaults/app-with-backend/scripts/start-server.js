'use strict';
require('@babel/register')({ extensions: ['.ts', '.tsx'] });
const LincdServer = require('lincd-server/lib/shapes/LincdServer');
let lincdConfig = require('../lincd.config');
require('./setup_storage');

let server = new LincdServer.LincdServer({
  loadAppComponent: () => require('../src/App').default,
  ...lincdConfig,
});
server.start();
