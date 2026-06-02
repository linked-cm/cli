import { LinkedFileStorage } from '@_linked/core/utils/LinkedFileStorage';
import { getAccessUrlLocalFileStore } from '@_linked/server/utils/accessUrl';
import { BackendAPIStore } from '@_linked/server/shapes/quadstores/BackendAPIStore';
import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';

// Frontend store: a proxy that forwards every query to this app's backend
// via /call/... endpoints. The backend in turn talks to Fuseki (configured
// in scripts/storage-config.js). The name passed to BackendAPIStore gives
// the proxy a deterministic instance URI so the request-side serialisation
// can reconstruct the store on the server. Match it to your dataset name
// (defaults to '${hyphen_name}-main' to mirror storage-config.js).
const store = new BackendAPIStore('${hyphen_name}-main');
LinkedStorage.setDefaultDataset(store);

// determine where assets at loaded from
// if (process.env.NODE_ENV === 'development') {
//by default assets are loaded from the file system of the node.js backend server
LinkedFileStorage.setDefaultAccessURL(getAccessUrlLocalFileStore());
// } else {
//   LinkedFileStorage.setDefaultAccessURL(getAccessURLS3FileStore());
// }
