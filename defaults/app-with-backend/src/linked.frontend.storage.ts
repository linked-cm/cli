// Frontend storage configuration for ${name}.
//
// Layer 1 (shape → alias routing) is in this file.
// Layer 2 (alias → store-type + endpoint) is in linked.frontend.datasets.json.
//
// The default mode proxies every query to the app's own backend via
// BackendAPIStore. The backend then routes per linked.backend.storage.ts.
//
// You can also wire an alias directly to a Fuseki / external SPARQL
// endpoint and skip the backend hop entirely. Useful for public read-only
// datasets, fully client-side apps, or hybrid setups. Add a `sparql`
// factory below and put a `{ "type": "sparql", "endpoint": "..." }` entry
// in linked.frontend.datasets.json. (Requires CORS + auth on the target.)
//
// Aliases in this file are independent from the backend's aliases — the
// framework re-routes by shape on each side. Matching names is a
// documentation convention, not a framework requirement. See arch-04
// §Frontend mirror.
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

// ── Parse linked.frontend.datasets.json ─────────────────────────────────
// No runtime env resolution in the browser (process.env isn't a real
// object there) — values in the FE JSON should be literals. If you need
// per-environment values, swap the JSON at build time or hardcode via
// `process.env.X` references which webpack inlines.
const config = parseDatasetsConfig(datasetsConfig, {});

// ── Build stores per alias ──────────────────────────────────────────────
// Default: a BackendAPIStore proxy per alias. Add or replace factories
// for any other dataset `type` strings you introduce.
const stores = buildStoresFromConfig(config, {
  'backend-api': (_entry, alias) => new BackendAPIStore(alias),
  // Direct-to-Fuseki alternative (advanced; no creds in browser):
  // sparql: ({ endpoint }) => {
  //   const url = new URL(endpoint as string);
  //   return new FusekiStore(
  //     url.pathname.slice(1),
  //     `${url.protocol}//${url.host}`,
  //   );
  // },
});

// ── Layer 1: shape → alias ───────────────────────────────────────────────
// Single alias → set as default. For multi-alias, mirror the routing in
// linked.backend.storage.ts:
//
//   import { PageView } from './shapes/PageView';
//   LinkedStorage.setDatasetForShapes(stores.analytics, [PageView]);
LinkedStorage.setDefaultDataset(stores.appData);

// ── File storage (where uploaded images load from) ──────────────────────
LinkedFileStorage.setDefaultAccessURL(getAccessUrlLocalFileStore());
