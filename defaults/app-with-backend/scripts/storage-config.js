import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';
import { LinkedFileStorage } from '@_linked/core/utils/LinkedFileStorage';
import { LocalFileStore } from '@_linked/server/shapes/filestores/LocalFileStore';
import { N3FileStore } from '@_linked/server/shapes/quadstores/N3FileStore';

//How quads are stored
let quadStore = new N3FileStore(process.env.NODE_ENV + '-main');
LinkedStorage.setDefaultDataset(quadStore);

//How files are stored
let fileStore = new LocalFileStore(process.env.NODE_ENV + '-main');
LinkedFileStorage.setDefaultDataset(fileStore);
