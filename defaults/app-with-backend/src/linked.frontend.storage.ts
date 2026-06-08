// Frontend storage for ${name}.
//
// Reads linked.frontend.datasets.json and instantiates one store per
// alias. Webpack can't bundle dynamic imports of arbitrary npm paths,
// so on the frontend we import each store class explicitly and
// construct it per-alias here.
//
// Aliases on this side are independent from backend aliases — the
// framework re-routes by shape on each side.
import datasetsConfig from './linked.frontend.datasets.json' with { type: 'json' };
import { parseDatasetsConfig } from '@_linked/core/utils/parseDatasetsConfig';
import { LinkedFileStorage } from '@_linked/core/utils/LinkedFileStorage';
import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';
import { BackendAPIStore } from '@_linked/server/shapes/quadstores/BackendAPIStore';
import { getAccessUrlLocalFileStore } from '@_linked/server/utils/accessUrl';
// Direct-to-Fuseki on the frontend? Uncomment:
// import { FusekiStore } from '@_linked/fuseki/shapes/FusekiStore';

// Parse JSON; pass empty env since the browser has no runtime process.env.
// Per-env values for the frontend should be hardcoded `process.env.X`
// references (webpack inlines them at build time).
const config = parseDatasetsConfig(datasetsConfig, {});

// One store per alias. Each line imports the class above and constructs it
// with the alias's `config`. Adding a new alias = add an import + a line.
const appData = new BackendAPIStore(config.datasets.appData.config);
// Direct-to-Fuseki alternative (no creds in browser):
// const appData = new FusekiStore(config.datasets.appData.config);

// Shape → alias. For multi-alias setups add per-shape pins, e.g.:
//   import { PageView } from './shapes/PageView';
//   LinkedStorage.setDatasetForShapes(analytics, [PageView]);
LinkedStorage.setDefaultDataset(appData);

// File asset URLs.
LinkedFileStorage.setDefaultAccessURL(getAccessUrlLocalFileStore());
