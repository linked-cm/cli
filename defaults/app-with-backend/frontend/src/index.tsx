window['$RefreshReg$'] = () => {};
window['$RefreshSig$'] = () => () => {};

import {hydrateRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App';
import React from 'react';
import {Storage} from 'lincd/lib/utils/Storage';
import {BackendFileStore} from 'lincd-server/lib/shapes/BackendFileStore';

//store all quads in a file on the backend named 'main'
export const store = new BackendFileStore('main');
Storage.setDefaultStore(store);

hydrateRoot(
  document,
  <React.StrictMode>
    <BrowserRouter>
      <App assets={window['assetManifest']} />
    </BrowserRouter>
  </React.StrictMode>,
);
