import fs from 'fs';
import os from 'os';
import path from 'path';
import {createViteConfig, ssrNoExternal} from '../../src/vite-config';

// In workspace mode only the source workspaces go through Vite SSR. Published
// framework packages (lib-only, under node_modules) must stay external so Vite-
// loaded source and Node-native `import()` (core's `loadStores`) share ONE
// `@_linked/core` instance.

function writeJson(file: string, json: unknown) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
}

// Mirrors Vite: `ssr.noExternal` entries are matched against the bare package name.
function bundled(noExternal: (string | RegExp)[], pkgName: string): boolean {
  return noExternal.some((p) => (typeof p === 'string' ? p === pkgName : p.test(pkgName)));
}

describe('ssr.noExternal', () => {
  let tmp: string;
  const cwd = process.cwd();

  beforeEach(() => {
    tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'linked-ssr-')));
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(tmp, {recursive: true, force: true});
  });

  it('bundles only source workspaces; published @_linked packages stay external', async () => {
    writeJson(path.join(tmp, 'package.json'), {
      name: 'root',
      private: true,
      workspaces: ['packages/*', 'services/*'],
    });
    const shapes = path.join(tmp, 'packages', 'shapes');
    writeJson(path.join(shapes, 'package.json'), {
      name: 'shapes',
      linkedPackage: true,
      dependencies: {'@_linked/core': '1.0.0'},
    });
    fs.mkdirSync(path.join(shapes, 'src'), {recursive: true});
    fs.writeFileSync(path.join(shapes, 'src', 'index.ts'), 'export {};');
    // Published core: lib only, installed at the root.
    const core = path.join(tmp, 'node_modules', '@_linked', 'core');
    writeJson(path.join(core, 'package.json'), {name: '@_linked/core', linkedPackage: true});
    fs.mkdirSync(path.join(core, 'lib'), {recursive: true});
    fs.symlinkSync(shapes, path.join(tmp, 'node_modules', 'shapes'), 'dir');
    const app = path.join(tmp, 'services', 'api');
    writeJson(path.join(app, 'package.json'), {
      name: 'api',
      dependencies: {'@_linked/core': '1.0.0', shapes: '*'},
    });

    process.chdir(app);
    const factory = createViteConfig() as any;
    const config = await factory({command: 'serve', mode: 'development'});
    const noExternal = config.ssr.noExternal as (string | RegExp)[];

    expect(noExternal).toEqual(['shapes']);
    expect(bundled(noExternal, 'shapes')).toBe(true);
    for (const pkg of ['@_linked/core', '@_linked/fuseki', '@_linked/server', 'lincd-foo']) {
      expect(bundled(noExternal, pkg)).toBe(false);
    }
    // Workspace mode keeps Vite's default conditions (`development` → src).
    expect(config.resolve).toBeUndefined();
    expect(config.ssr.resolve).toBeUndefined();
  });

  it('standalone bundles only the context-holding framework packages', () => {
    const noExternal = ssrNoExternal([]);
    expect(bundled(noExternal, '@_linked/server-utils')).toBe(true);
    expect(bundled(noExternal, '@_linked/react')).toBe(true);
    expect(bundled(noExternal, '@_linked/core')).toBe(false);
  });
});
