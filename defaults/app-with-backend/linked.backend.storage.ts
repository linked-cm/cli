// Backend storage configuration for ${name}.
//
// Layer 1 (shape → alias routing) is in this file.
// Layer 2 (alias → endpoint + creds) is in linked.backend.datasets.json.
//
// Per arch-04 §Dataset configuration model:
//   - storage-config code defines what shapes live under which alias.
//   - The datasets JSON maps each alias to a physical store + credentials.
//
// The CN Execution Gateway reads the same files in hosted mode to wire up
// per-alias routing on the backend's behalf. In unplugged / ejected mode
// (this template), the app's own backend does the routing directly via
// LinkedStorage.
//
// See also: src/linked.frontend.storage.ts (mirror file for the frontend).
// https://linked.cm for the @_linked DSL.
import datasetsConfig from './linked.backend.datasets.json' assert { type: 'json' };
import {
  parseDatasetsConfig,
  buildStoresFromConfig,
} from '@_linked/core/utils/parseDatasetsConfig';
import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';
import { LinkedFileStorage } from '@_linked/core/utils/LinkedFileStorage';
import { FusekiStore } from '@_linked/fuseki/shapes/FusekiStore';
import { LocalFileStore } from '@_linked/server/shapes/filestores/LocalFileStore';

// ── Parse + env-resolve linked.backend.datasets.json ────────────────────
// Placeholders like ${FUSEKI_PASSWORD:-admin} are resolved here at boot.
const config = parseDatasetsConfig(datasetsConfig, process.env);

// ── Build stores per alias ──────────────────────────────────────────────
// Add factories for any additional dataset `type` strings you introduce in
// linked.backend.datasets.json — each factory returns the IDataset to bind
// for that alias.
const stores = buildStoresFromConfig(config, {
  sparql: ({ endpoint }) => {
    const url = new URL(endpoint as string);
    return new FusekiStore(
      url.pathname.slice(1),
      `${url.protocol}//${url.host}`,
    );
  },
});

// Auto-create the dataset on first boot. Set FUSEKI_DB_TYPE=mem for an
// in-memory dataset (lost on restart); default 'tdb2' is persistent.
const appData = stores.appData as FusekiStore;
appData
  .ensureDatasetExists()
  .catch((err) =>
    console.warn('[linked.backend.storage] could not ensure dataset:', err),
  );

// ── Layer 1: shape → alias ───────────────────────────────────────────────
// Single alias → set as default (covers every shape). For multi-alias setups
// route specific shapes to their alias, e.g.:
//
//   import { Person } from '@_linked/schema/shapes/Person';
//   LinkedStorage.setDatasetForShapes(stores.appData, [Person]);
//
// Mirror the same routing in src/linked.frontend.storage.ts so the
// frontend's per-alias stores match up.
LinkedStorage.setDefaultDataset(appData);

// ── File storage (orthogonal to RDF) ────────────────────────────────────
const fileStore = new LocalFileStore(
  (process.env.NODE_ENV || 'development') + '-files',
);
LinkedFileStorage.setDefaultDataset(fileStore);
