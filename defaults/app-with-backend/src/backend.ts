//import all ShapeProviders here or define a generic BackendProvider, see https://linked.cm

import { BackendProvider } from '@_linked/server-utils/utils/BackendProvider';

export class Backend extends BackendProvider {
  constructor(server, linkedServer) {
    super(server, linkedServer);
  }
}
