// Guards the CLI tarball against nested ignore files under defaults/. npm
// honours a nested .npmignore (and strips .gitignore) when packing the CLI, which
// silently dropped defaults/package/src from the published package (D15a).
import fs from 'fs';
import os from 'os';
import path from 'path';
import {glob} from 'glob';
import {renameShippedDotfiles} from '../../src/utils/shippedDotfiles.js';

const repoRoot = path.resolve(__dirname, '..', '..');

describe('packaging', () => {
  test('defaults ships no nested ignore files', async () => {
    const found = await glob('defaults/**/{.npmignore,.gitignore}', {
      cwd: repoRoot,
      dot: true,
      ignore: '**/node_modules/**',
    });
    expect(found).toEqual([]);
  });

  test('createPackage renames npmignore.template', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'linked-cli-package-'));
    try {
      fs.cpSync(path.join(repoRoot, 'defaults', 'package'), tmp, {
        recursive: true,
      });
      renameShippedDotfiles(tmp);
      expect(fs.existsSync(path.join(tmp, '.npmignore'))).toBe(true);
      expect(fs.existsSync(path.join(tmp, 'npmignore.template'))).toBe(false);
    } finally {
      fs.rmSync(tmp, {recursive: true, force: true});
    }
  });
});
