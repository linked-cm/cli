'use strict';
require('@babel/register')({extensions: ['.ts', '.tsx']});
const LincdServer = require('lincd-server/lib/shapes/LincdServer');
let lincdConfig = require("../lincd.config");
let server = new LincdServer.LincdServer({loadAppComponent: () => require('../frontend/src/App').default,...lincdConfig});
server.start();
