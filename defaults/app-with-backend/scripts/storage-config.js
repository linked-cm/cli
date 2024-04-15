const { Storage } = require('lincd/lib/utils/Storage');
const { LocalFileStore } = require('lincd-server/lib/shapes/filestores/LocalFileStore');
const { LinkedFileStorage } = require('lincd/lib/utils/LinkedFileStorage');
const { N3FileStore } = require('lincd-server/lib/shapes/quadstores/N3FileStore');

//How quads are stored
let quadStore = new N3FileStore(process.env.NODE_ENV + '-main');
Storage.setDefaultStore(quadStore);

//How files are stored
let fileStore = new LocalFileStore(process.env.NODE_ENV + '-main');
LinkedFileStorage.setDefaultStore(fileStore);
