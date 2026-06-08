// Imports from `@_linked/react/package` (not `@_linked/core/utils/Package`)
// because `linkedComponent` / `linkedSetComponent` are React-only — they
// don't exist on core's LinkedPackageObject. The react helper composes
// React-only fns on top of everything core's linkedPackage provides.
import { linkedPackage } from '@_linked/react/package';

export const {
  linkedComponent,
  linkedSetComponent,
  linkedShape,
  linkedUtil,
  linkedOntology,
  registerPackageExport,
  packageExports,
  packageName,
} = linkedPackage('${hyphen_name}');
