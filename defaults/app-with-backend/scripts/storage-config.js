// Storage configuration for ${name}.
// Defaults to a local Apache Jena Fuseki instance at http://localhost:3030
// with dataset '${hyphen_name}-main'. Override via the env vars:
//   FUSEKI_BASE_URL  (default http://localhost:3030)
//   FUSEKI_DATASET   (default ${hyphen_name}-main)
//
// Make sure Fuseki is running, e.g.:
//   docker run -d --rm -p 3030:3030 --name fuseki stain/jena-fuseki
//
// See https://linked.cm for storage routing patterns.
import { FusekiStore } from '@_linked/fuseki/shapes/FusekiStore';
import { LocalFileStore } from '@_linked/server/shapes/filestores/LocalFileStore';
import { LinkedFileStorage } from '@_linked/core/utils/LinkedFileStorage';
import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';

const fusekiUrl = process.env.FUSEKI_BASE_URL || 'http://localhost:3030';
const datasetName = process.env.FUSEKI_DATASET || '${hyphen_name}-main';

const appData = new FusekiStore(datasetName, fusekiUrl);
LinkedStorage.setDefaultDataset(appData);

// Auto-create the dataset on first boot so the app is usable immediately.
// FUSEKI_USER / FUSEKI_PASSWORD env vars must be set (defaulted in
// .env-cmdrc.json to the stain/jena-fuseki Docker image's admin/admin).
// Set FUSEKI_DB_TYPE=mem for an in-memory dataset (lost on restart) or
// keep the default 'tdb2' for persistent on-disk storage.
appData
  .ensureDatasetExists()
  .catch((err) => console.warn('[storage-config] could not ensure dataset:', err));

const fileStore = new LocalFileStore((process.env.NODE_ENV || 'development') + '-files');
LinkedFileStorage.setDefaultDataset(fileStore);
