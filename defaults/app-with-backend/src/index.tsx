import {initFrontend} from 'lincd-server-utils/lib/utils/Frontend';
import {hydrateRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App';
import React from 'react';
import {Storage} from 'lincd/lib/utils/Storage';
import {BackendAPIStore} from 'lincd-server/lib/shapes/BackendAPIStore';
import {AppContextProvider} from 'lincd-server-utils/lib/components/AppContext';

window['$RefreshReg$'] = () => {};
window['$RefreshSig$'] = () => () => {};

//forward all storage requests to the backend
export const store = new BackendAPIStore();
Storage.setDefaultStore(store);

initFrontend().then(() => {
  hydrateRoot(
    document,
    <React.StrictMode>
      <BrowserRouter>
        <AppContextProvider
          assets={window['assetManifest']}
          requestLD={document.getElementById('request-ld')?.innerText}
          requestObject={document.getElementById('request-json')?.innerText}
        >
          <App />
        </AppContextProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );
});
