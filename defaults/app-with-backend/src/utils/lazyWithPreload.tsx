import { ComponentType, lazy } from 'react';

export interface PreloadableComponent<T extends ComponentType<any>> {
  preload: () => Promise<{ default: T }>;
  Component: React.LazyExoticComponent<T>;
}

/**
 * Creates a lazy-loaded component with a preload function
 * This allows preloading the component before React needs it
 *
 * @example
 * const SigninPage = lazyWithPreload(() => import('./pages/Signin'));
 * // Later, before navigation or on server:
 * SigninPage.preload();
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): PreloadableComponent<T> {
  let modulePromise: Promise<{ default: T }> | null = null;

  const preload = () => {
    if (!modulePromise) {
      modulePromise = importFunc();
    }
    return modulePromise;
  };

  const Component = lazy(() => {
    // If preload was called, reuse the same promise
    // This ensures React uses the already-loaded module
    if (!modulePromise) {
      modulePromise = importFunc();
    }
    return modulePromise;
  });

  return {
    preload,
    Component,
  };
}
