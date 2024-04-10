import { initFrontend } from 'lincd-server-utils/lib/utils/Frontend';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import React from 'react';
import { AppContextProvider } from 'lincd-server-utils/lib/components/AppContext';

//import the storage & file configuration for the frontend
import './config-frontend';

window['$RefreshReg$'] = () => {};
window['$RefreshSig$'] = () => () => {};

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
