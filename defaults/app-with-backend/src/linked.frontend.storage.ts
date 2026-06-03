// Frontend storage for ${name}.
//
// Maps each alias declared in linked.frontend.datasets.json to a store
// instance the browser uses. The default BackendAPIStore proxies every
// query to the app's own backend; swap to a different store class to talk
// directly to a public SPARQL endpoint or browser-local RDF store.
//
// Aliases on this side are independent from backend aliases — the
// framework re-routes by shape on each side.
import datasetsConfig from './linked.frontend.datasets.json' assert { type: 'json' };
import {
  parseDatasetsConfig,
  buildStoresFromConfig,
} from '@_linked/core/utils/parseDatasetsConfig';
import { LinkedFileStorage } from '@_linked/core/utils/LinkedFileStorage';
import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';
import { BackendAPIStore } from '@_linked/server/shapes/quadstores/BackendAPIStore';
import { getAccessUrlLocalFileStore } from '@_linked/server/utils/accessUrl';
// Uncomment to enable direct-to-Fuseki on the frontend:
// import { FusekiStore } from '@_linked/fuseki/shapes/FusekiStore';

// No ${VAR} interpolation in the browser — pass an empty env. For per-env
// values, hardcode `process.env.X` references in this file (webpack inlines
// them at build).
const config = parseDatasetsConfig(datasetsConfig, {});

// Factory map keyed by npm import path — matches `store` in the JSON.
const stores = buildStoresFromConfig(config, {
  '@_linked/server/shapes/quadstores/BackendAPIStore': ({ alias }, fallbackAlias) =>
    new BackendAPIStore((alias as string) || fallbackAlias),
  // Direct-to-Fuseki alternative (no creds in browser):
  // '@_linked/fuseki/shapes/FusekiStore': ({ endpoint }) => {
  //   const url = new URL(endpoint as string);
  //   return new FusekiStore(url.pathname.slice(1), `${url.protocol}//${url.host}`);
  // },
});

// Shape → alias. For multi-alias setups add per-shape pins, e.g.:
//   import { PageView } from './shapes/PageView';
//   LinkedStorage.setDatasetForShapes(stores.analytics, [PageView]);
LinkedStorage.setDefaultDataset(stores.appData);

// File asset URLs.
LinkedFileStorage.setDefaultAccessURL(getAccessUrlLocalFileStore());
