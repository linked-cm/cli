import { AppContextProvider } from 'lincd-server-utils/components/AppContext';
import { initFrontend } from 'lincd-server-utils/utils/Frontend';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { preloadMatchedRoute } from './utils/preloadRoutes';

//import the storage & file configuration for the frontend
import './config-frontend';

//to avoid errors with react-refresh-webpack-plugin
window['$RefreshReg$'] = () => {};
window['$RefreshSig$'] = () => () => {};

initFrontend().then(async () => {
  // Preload matched route before hydration to avoid Suspense mismatch
  await preloadMatchedRoute();

  hydrateRoot(
    document.getElementById('root'), // Target the #root div for hydration
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
