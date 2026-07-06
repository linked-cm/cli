// linkedPackage is exported by @_linked/core/utils/Package.ts (verified).
// Direct swap from legacy 'lincd/utils/Package' since the new name has
// a 1:1 export match for this symbol.
import {linkedPackage} from '@_linked/core/utils/Package';

export const {
  linkedComponent,
  linkedShape,
  linkedUtil,
  linkedOntology,
  registerPackageExport,
  packageExports,
  packageName,
  getPackageShape

} = linkedPackage('${package_name}');
