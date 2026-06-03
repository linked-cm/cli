// Backend storage for ${name}.
//
// Maps each alias declared in linked.backend.datasets.json to a store
// instance, then pins shape→store routing via LinkedStorage. See the
// mirror file at src/linked.frontend.storage.ts for the frontend side.
import datasetsConfig from './linked.backend.datasets.json' assert { type: 'json' };
import {
  parseDatasetsConfig,
  buildStoresFromConfig,
} from '@_linked/core/utils/parseDatasetsConfig';
import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';
import { LinkedFileStorage } from '@_linked/core/utils/LinkedFileStorage';
import { FusekiStore } from '@_linked/fuseki/shapes/FusekiStore';
import { LocalFileStore } from '@_linked/server/shapes/filestores/LocalFileStore';

// Resolve ${VAR} placeholders against the runtime environment.
const config = parseDatasetsConfig(datasetsConfig, process.env);

// Build stores from the JSON. Each factory is keyed by the same npm
// import-path string that appears under `store` in the JSON, and receives
// the entry's `config` object verbatim.
const stores = buildStoresFromConfig(config, {
  '@_linked/fuseki/shapes/FusekiStore': ({ endpoint }) => {
    const url = new URL(endpoint as string);
    return new FusekiStore(url.pathname.slice(1), `${url.protocol}//${url.host}`);
  },
});

// Auto-create the dataset on first boot. Override FUSEKI_DB_TYPE=mem in
// the JSON or env for an in-memory dataset (lost on restart).
const appData = stores.appData as FusekiStore;
appData.ensureDatasetExists().catch((err) => console.warn('dataset ensure failed:', err));

// Shape → alias. Single alias → default for every shape. For multi-alias
// add per-shape pins, e.g.:
//   import { Person } from '@_linked/schema/shapes/Person';
//   LinkedStorage.setDatasetForShapes(stores.appData, [Person]);
LinkedStorage.setDefaultDataset(appData);

// File storage (binary assets). Separate from RDF dataset routing.
const fileStore = new LocalFileStore(
  (process.env.NODE_ENV || 'development') + '-files',
);
LinkedFileStorage.setDefaultDataset(fileStore);
