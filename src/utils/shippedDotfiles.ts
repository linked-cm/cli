import fs from 'fs';
import path from 'path';

const SHIPPED_DOTFILES: Record<string, string> = {
  'gitignore.template': '.gitignore',
  'npmignore.template': '.npmignore',
  'env.example.template': '.env.example',
};

const SHIPPED_DOT_DIRECTORIES: Record<string, string> = {
  'github.template': '.github',
};

// npm strips .gitignore files and honours nested .npmignore files when packing
// the CLI, so templates ship dotfiles (and dot-directories such as .github/)
// under neutral names and scaffolding restores them, at any depth.
export function renameShippedDotfiles(folder: string): void {
  for (const entry of fs.readdirSync(folder, {withFileTypes: true})) {
    let full = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      const dotName = SHIPPED_DOT_DIRECTORIES[entry.name];
      if (dotName) {
        const renamed = path.join(folder, dotName);
        fs.renameSync(full, renamed);
        full = renamed;
      }
      renameShippedDotfiles(full);
    } else if (SHIPPED_DOTFILES[entry.name]) {
      fs.renameSync(full, path.join(folder, SHIPPED_DOTFILES[entry.name]));
    }
  }
}
