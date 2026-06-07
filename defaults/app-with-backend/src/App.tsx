import './theme.css'; //needs to be the first import before importing other components
import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Spinner } from './components/Spinner';
import { Error } from './components/Error';
import { AppRoot } from '@_linked/server-utils/components/AppRoot';
import { Head } from '@_linked/server-utils/components/Head';
import { Body } from '@_linked/server-utils/components/Body';
import AppRoutes, { ROUTES } from './routes';
import style from './App.module.css'; //import any .module.css file like this and access the classnames from the style object

// To add sign-in to this app, install `@_linked/auth`, wrap <AppRoutes/>
// in <ProvideAuth>, and uncomment the `requireAuth` line in routes.tsx.

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
