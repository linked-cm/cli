import { LinkedStorage } from 'lincd/utils/LinkedStorage';
import { LinkedFileStorage } from 'lincd/utils/LinkedFileStorage';
import { LocalFileStore } from 'lincd-server/shapes/filestores/LocalFileStore';
import { N3FileStore } from 'lincd-server/shapes/quadstores/N3FileStore';

//How quads are stored
let quadStore = new N3FileStore(process.env.NODE_ENV + '-main');
LinkedStorage.setDefaultStore(quadStore);

//How files are stored
let fileStore = new LocalFileStore(process.env.NODE_ENV + '-main');
LinkedFileStorage.setDefaultStore(fileStore);
