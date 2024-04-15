const { NodeFileStore } = require('lincd-server/lib/shapes/NodeFileStore');
const { LinkedStorage } = require('lincd/utils/LinkedStorage');

//on the backend, we use a file store which stores all data as JSON-LD
let quadStore = new NodeFileStore(process.env.NODE_ENV + '-main');
LinkedStorage.setDefaultStore(quadStore);
