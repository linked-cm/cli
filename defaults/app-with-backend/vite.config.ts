// Vite config for new linked apps. Uses the shared createViteConfig
// helper from @_linked/cli/vite-config so future Vite upgrades propagate
// to every linked app via a cli bump.
//
// Run with:
//   yarn start          (Vite dev — plan-010 default once stable)
//   yarn start:webpack  (legacy webpack path — migration escape hatch)
import {createViteConfig} from '@_linked/cli/vite-config';

export default createViteConfig({
  port: 4040,
  cssMode: 'tailwind',
});
