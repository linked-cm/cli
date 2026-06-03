// Backend storage configuration for ${name}.
//
// This file maps aliases (logical buckets your shapes are stored in) to
// the physical stores your app backend talks to directly. It is the
// authoritative shape→alias→endpoint wiring for the backend; the
// Execution Gateway (in CN-hosted mode) reads the same file to wire up
// per-alias routing on the backend's behalf.
//
// Two layers per arch-04 §Dataset configuration model:
//   Layer 1 — shape → alias (this is code; you edit it here)
//   Layer 2 — alias → endpoint (env vars below; later: linked.datasets.json
//             when an app is ejected from CN — see backlog 016)
//
// Env vars consumed:
//   FUSEKI_BASE_URL   default http://localhost:3030
//   FUSEKI_DATASET    default ${hyphen_name}-main
//   FUSEKI_USER       default admin
//   FUSEKI_PASSWORD   default admin
//   FUSEKI_DB_TYPE    default tdb2 (use 'mem' for in-memory)
//
// See also: src/frontend-storage-config.ts (the mirror file for the
// frontend). https://linked.cm for the @_linked DSL.
import { FusekiStore } from '@_linked/fuseki/shapes/FusekiStore';
import { LocalFileStore } from '@_linked/server/shapes/filestores/LocalFileStore';
import { LinkedFileStorage } from '@_linked/core/utils/LinkedFileStorage';
import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';

// ── Layer 2: aliases → stores ────────────────────────────────────────────
// The starter ships with one alias (`appData`) backed by a single Fuseki
// dataset. To add a second alias, e.g. `analytics`:
//
//   const analytics = new FusekiStore(
//     process.env.ANALYTICS_FUSEKI_DATASET || '${hyphen_name}-analytics',
//     process.env.ANALYTICS_FUSEKI_BASE_URL || process.env.FUSEKI_BASE_URL || 'http://localhost:3030',
//   );
const appData = new FusekiStore(
  process.env.FUSEKI_DATASET || '${hyphen_name}-main',
  process.env.FUSEKI_BASE_URL || 'http://localhost:3030',
);

// Auto-create the dataset on first boot.
appData
  .ensureDatasetExists()
  .catch((err) =>
    console.warn('[backend-storage-config] could not ensure dataset:', err),
  );

// ── Layer 1: shape → alias ───────────────────────────────────────────────
// Single alias → set as default (covers every shape). For multi-alias
// setups route specific shapes to their alias, e.g.:
//
//   import { PageView } from './src/shapes/PageView';
//   LinkedStorage.setDatasetForShapes(analytics, [PageView]);
//
// Mirror the same routing in src/frontend-storage-config.ts so the
// frontend's per-alias stores match up.
LinkedStorage.setDefaultDataset(appData);

// ── File storage (orthogonal to RDF) ────────────────────────────────────
const fileStore = new LocalFileStore(
  (process.env.NODE_ENV || 'development') + '-files',
);
LinkedFileStorage.setDefaultDataset(fileStore);
