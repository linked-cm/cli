import './theme.css'; //needs to be the first import before importing other components
import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Spinner } from './components/Spinner';
import { Error } from './components/Error';
import { AppRoot } from 'lincd-server-utils/components/AppRoot';
import { Head } from 'lincd-server-utils/components/Head';
import { Body } from 'lincd-server-utils/components/Body';
import AppRoutes, { ROUTES } from './routes';
import { ProvideAuth } from 'lincd-auth/hooks/useAuth';
import style from './App.module.css'; //import any .module.css file like this and access the classnames from the style object

export default function App() {
  return (
    <AppRoot>
      <Head>
        {/*  Add tags to html <head> here, for example, a font <link href='https://fonts.someapi.com/...' />*/}
      </Head>
      <Body routes={ROUTES} pageStyles={style} className={style.App}>
        <Suspense fallback={<Spinner />}>
          <ErrorBoundary FallbackComponent={Error}>
            <ProvideAuth>
              <AppRoutes />
            </ProvideAuth>
          </ErrorBoundary>
        </Suspense>
      </Body>
    </AppRoot>
  );
}
