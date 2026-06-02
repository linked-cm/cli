import { LinkedFileStorage } from '@_linked/core/utils/LinkedFileStorage';
import { getAccessUrlLocalFileStore } from '@_linked/server/utils/accessUrl';
import { BackendAPIStore } from '@_linked/server/shapes/quadstores/BackendAPIStore';
import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';

// store all quads in a file on the backend named 'main'
// export const store = new BackendFileStore('main');
const store = new BackendAPIStore();
LinkedStorage.setDefaultDataset(store);

// determine where assets at loaded from
// if (process.env.NODE_ENV === 'development') {
//by default assets are loaded from the file system of the node.js backend server
LinkedFileStorage.setDefaultAccessURL(getAccessUrlLocalFileStore());
// } else {
//   LinkedFileStorage.setDefaultAccessURL(getAccessURLS3FileStore());
// }