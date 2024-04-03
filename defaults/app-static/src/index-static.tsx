import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App';
import {BackendAPIStore} from 'lincd-server/lib/shapes/BackendAPIStore';
import {LinkedStorage} from 'lincd/utils/LinkedStorage';
import {AppContextProvider} from 'lincd-server-utils/lib/components/AppContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
//a BackendAPIStore is the default setup
//it forwards all storage requests to a backend server
export const store = new BackendAPIStore();
LinkedStorage.setDefaultStore(store);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppContextProvider isNativeApp={true}>
        <App />
      </AppContextProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
