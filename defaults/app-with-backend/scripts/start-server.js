'use strict';
require('@babel/register')({extensions: ['.ts', '.tsx']});
const LincdServer = require('lincd-server/lib/shapes/LincdServer');
let lincdConfig = require("../lincd.config");
const {NodeFileStore} = require('lincd-server/lib/shapes/NodeFileStore');
const {Storage} = require('lincd/lib/utils/Storage');

//on the backend, we use a file store which stores all data as JSON-LD
let fileStore = new NodeFileStore(process.env.NODE_ENV+'-main');
Storage.setDefaultStore(fileStore);

let server = new LincdServer.LincdServer({loadAppComponent: () => require('../src/App').default,...lincdConfig});
server.start();