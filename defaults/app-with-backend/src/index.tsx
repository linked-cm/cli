import { initFrontend } from 'lincd-server-utils/utils/Frontend';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import React from 'react';
import { AppContextProvider } from 'lincd-server-utils/components/AppContext';

//import the storage & file configuration for the frontend
import './config-frontend';

//to avoid errors with react-refresh-webpack-plugin
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
          requestObject={JSON.parse(document.getElementById('request-json')?.innerText || '{}')}
        >
          <App />
        </AppContextProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );
});
