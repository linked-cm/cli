//import all ShapeProviders here or define a generic BackendProvider, see documentation on https://docs.lincd.org

import { BackendProvider } from 'lincd-server-utils/utils/BackendProvider';

export class Backend extends BackendProvider {
  constructor(server, lincdServer) {
    super(server, lincdServer);
  }
}
