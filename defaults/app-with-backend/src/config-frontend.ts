import { LinkedFileStorage } from 'lincd/lib/utils/LinkedFileStorage';
import { getAccessUrlLocalFileStore } from 'lincd-server/lib/utils/accessUrl';
import { BackendAPIStore } from 'lincd-server/lib/shapes/quadstores/BackendAPIStore';
import { LinkedStorage } from 'lincd/lib/utils/LinkedStorage';

// store all quads in a file on the backend named 'main'
// export const store = new BackendFileStore('main');
const store = new BackendAPIStore();
LinkedStorage.setDefaultStore(store);

// determine where assets at loaded from
// if (process.env.NODE_ENV === 'development') {
  //by default assets are loaded from the file system of the node.js backend server
  LinkedFileStorage.setDefaultAccessURL(getAccessUrlLocalFileStore());
// } else {
//   LinkedFileStorage.setDefaultAccessURL(getAccessURLS3FileStore());
// }