import React, {lazy, Suspense} from 'react';
import {Route, Routes} from 'react-router-dom';
import {Spinner} from './components/Spinner';
import {RequireAuth} from 'lincd-auth/lib/components/RequireAuth';
import PageNotFound from './pages/PageNotFound';

//In React 18 you can use 'lazy' to import pages only when you need them.
//This will cause webpack to create multiple bundles, and the right bundles are automatically loaded
interface RouteObj {
  path: string;
  component?: React.LazyExoticComponent<() => JSX.Element>;
  render?: () => JSX.Element;
  requireAuth?: boolean;
  excludeFromMenu?: boolean;
  label?: string;
}
export const ROUTES: {[key: string]: RouteObj} = {
  index: {
    path: '/',
    component: lazy(() => import('./pages/Home' /* webpackPrefetch: true */)),
    label: 'Home',
  },
  page1: {
    path: '/page1',
    component: lazy(() => import('./pages/Page1' /* webpackPrefetch: true */)),
    label: 'Protected page',
    requireAuth: true,
  },
  signin: {
    path: '/signin',
    component: lazy(() => import('./pages/Signin' /* webpackPrefetch: true */)),
    label: 'Sign In',
    excludeFromMenu: true,
  },
};

export default function AppRoutes() {
  return (
    <Routes>
      {Object.keys(ROUTES).map((routeName) => {
        const route = ROUTES[routeName];
        const Component = route.component;

        //if a route is marked as requireAuth, wrap it in the RequireAuth component and pass the signinRoute
        const AuthGuard = route.requireAuth ? RequireAuth : React.Fragment;
        const authProps = route.requireAuth
          ? {signinRoute: ROUTES.signin.path}
          : {};

        // define a render function that determines what to render based on the component and route.render
        const renderRoute = () =>
          // if a Component is defined, render it using JSX syntax (<Component />)
          // if not, check if a route.render function is defined and call that render function if available.
          // if neither Component nor route.render is defined, return null
          Component ? <Component /> : route.render ? route.render() : null;

        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <AuthGuard {...authProps}>
                <Suspense fallback={<Spinner />}>{renderRoute()}</Suspense>
              </AuthGuard>
            }
          />
        );
      })}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}
