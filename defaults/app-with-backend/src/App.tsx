import React, {Suspense} from 'react';
import {ErrorBoundary} from 'react-error-boundary';
import {Spinner} from './components/Spinner';
import {Error} from './components/Error';
import {AppRoot} from 'lincd-server-utils/lib/components/AppRoot';
import {Head} from 'lincd-server-utils/lib/components/Head';
import {Body} from 'lincd-server-utils/lib/components/Body';
import AppRoutes, {ROUTES} from './routes';

//Note that by default LINCD apps are set up with support for SCSS (sass) and CSS Modules
//So any .scss file needs to be imported by itself
import './App.scss';
//and then the .scss.json file needs to be imported to access the class names (this file will be automatically generated)
import style from './App.scss.json';

export default function App() {
  return (
    <AppRoot>
      <Head>
        {/*  Add tags to html <head> here, for example, a font <link href='https://fonts.someapi.com/...' />*/}
      </Head>
      <Body routes={ROUTES} pageStyles={style} className={style.App}>
        <Suspense fallback={<Spinner />}>
          <ErrorBoundary FallbackComponent={Error}>
            <AppRoutes />
          </ErrorBoundary>
        </Suspense>
      </Body>
    </AppRoot>
  );
}
