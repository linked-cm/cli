/**
 * Client-side script to preload lazy routes before hydration
 * This should be called BEFORE React's hydrateRoot()
 */

// This will be populated by the server with the routes that need preloading
declare global {
  interface Window {
    __PRELOAD_ROUTES__?: string[];
  }
}

export async function preloadMatchedRoute() {
  // Get the list of routes to preload from the server
  const routesToPreload = window.__PRELOAD_ROUTES__ || [];

  if (routesToPreload.length === 0) {
    return;
  }

  // Dynamically import the routes module to access PRELOADABLE_ROUTES
  const routesModule = await import('../routes');
  const { PRELOADABLE_ROUTES } = routesModule;

  // Preload each route
  const preloadPromises = routesToPreload
    .map((routeKey) => {
      const preloadableRoute = PRELOADABLE_ROUTES[routeKey];
      if (preloadableRoute && preloadableRoute.preload) {
        return preloadableRoute.preload();
      }
      return null;
    })
    .filter(Boolean);

  // Wait for all preloads to complete
  await Promise.all(preloadPromises);
}
