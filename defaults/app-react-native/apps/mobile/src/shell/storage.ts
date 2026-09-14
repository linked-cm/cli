// Sends every Linked query to the API (services/api). Import @_linked/server by subpath only: the root barrel
// pulls express, webpack and react-dom.
// ./env comes first: BackendAPIStore's server proxy reads SITE_ROOT once.
import './env';

import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';
import { BackendAPIStore } from '@_linked/server/shapes/quadstores/BackendAPIStore';

LinkedStorage.setDefaultDataset(new BackendAPIStore({ name: 'appData' }));
