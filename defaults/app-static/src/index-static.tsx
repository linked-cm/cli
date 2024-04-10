import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App';
import {AppContextProvider} from 'lincd-server-utils/lib/components/AppContext';

//import the storage & file configuration for the frontend
import './config-frontend';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppContextProvider isNativeApp={true}>
        <App />
      </AppContextProvider>
    </BrowserRouter>
  </React.StrictMode>
);