import React, {lazy, Suspense} from 'react';
import {Route, Routes} from 'react-router-dom';
import {Spinner} from './components/Spinner';

//In React 18 you can use 'lazy' to import pages only when you need them.
//This will cause webpack to create multiple bundles, and the right bundles are automatically loaded

export const ROUTES = {
  index: {
    path: '/',
    component: lazy(() => import('./pages/Home' /* webpackPrefetch: true */)),
    requireAuth: true,
    label:"Home",
  },
  page1: {
    path: '/page1',
    component: lazy(() => import('./pages/Page1' /* webpackPrefetch: true */)),
    label:"Page 1",
  },
};

export default function AppRoutes() {
  return (
    <Routes>
      {Object.keys(ROUTES).map((routeName) => {
        const route = ROUTES[routeName];
        const Component = route.component;
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <Suspense fallback={<Spinner />}>
                <Component />
              </Suspense>
            }
          />
        );
      })}
    </Routes>
  );
}
