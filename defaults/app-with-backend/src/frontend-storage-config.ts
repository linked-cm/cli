// Frontend storage configuration for ${name}.
//
// This file maps aliases (same names as in backend-storage-config.ts) to
// the IDataset implementations the frontend uses. The default — and what
// most apps want — is to proxy everything to the app's own backend via
// BackendAPIStore. The backend then routes per backend-storage-config.ts.
//
// You can also wire an alias directly to a Fuseki / external SPARQL
// endpoint and skip the backend hop entirely. Useful for public
// read-only datasets, fully client-side apps, or hybrid setups. See the
// commented FusekiStore alternative below. (Requires CORS + appropriate
// auth on the target endpoint.)
//
// Aliases must match the names declared in ../backend-storage-config.ts.
// Shape→alias routing on this side should mirror the backend (so the
// frontend's per-alias store is the one consulted for queries on those
// shapes). See https://linked.cm for the @_linked DSL.
import { BackendAPIStore } from '@_linked/server/shapes/quadstores/BackendAPIStore';
import { LinkedFileStorage } from '@_linked/core/utils/LinkedFileStorage';
import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';
import { getAccessUrlLocalFileStore } from '@_linked/server/utils/accessUrl';
// Uncomment to enable direct-to-Fuseki on the frontend:
// import { FusekiStore } from '@_linked/fuseki/shapes/FusekiStore';

// ── Layer 2: aliases → stores ────────────────────────────────────────────
// Default mode — proxy every query to the app's own backend.
const appData = new BackendAPIStore('appData');

// Direct-to-Fuseki alternative (browser → Fuseki, no backend hop). The
// Fuseki endpoint must have CORS enabled and credentials handled
// appropriately (env vars are inlined into the browser bundle at build
// time, so don't ship secrets this way):
//
//   const appData = new FusekiStore(
//     process.env.FUSEKI_DATASET || '${hyphen_name}-main',
//     process.env.PUBLIC_FUSEKI_URL || 'https://fuseki.example.com',
//   );

// ── Layer 1: shape → alias ───────────────────────────────────────────────
// Single alias → set as default. For multi-alias, mirror the routing in
// backend-storage-config.ts:
//
//   import { PageView } from './shapes/PageView';
//   LinkedStorage.setDatasetForShapes(analyticsProxy, [PageView]);
LinkedStorage.setDefaultDataset(appData);

// ── File storage (where uploaded images load from) ──────────────────────
LinkedFileStorage.setDefaultAccessURL(getAccessUrlLocalFileStore());
