import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import {execp} from '../utils.js';

/**
 * Run a yarn command at the workspace root while preserving nested repositories'
 * yarn.lock files. Used when the workspace contains sibling repos (via mrgit)
 * whose own lockfiles should not be clobbered by a root-level `yarn install`.
 *
 * Reads mrgit.json to determine which nested repos exist. If mrgit.json is
 * missing, falls back to plain yarn behavior.
 */
export async function safeYarn(args: string[]): Promise<void> {
  const mrgitPath = path.join(process.cwd(), 'mrgit.json');
  const yarnCmd = `yarn ${args.join(' ')}`;

  if (!fs.existsSync(mrgitPath)) {
    await execp(yarnCmd, true, false);
    return;
  }

  const mrgit = JSON.parse(fs.readFileSync(mrgitPath, 'utf8'));
  const nestedRepos = Object.keys(mrgit.dependencies || {}).map((dep) => {
    // mrgit repo keys can be scoped (e.g. @_linked/core) or plain (the-game).
    // The folder they land in is `packages/<last-segment>`.
    const folder = dep.includes('/') ? dep.split('/').pop() : dep;
    return {name: dep, path: path.join(process.cwd(), 'packages', folder!)};
  });

  console.log(
    chalk.magenta(
      `Preserving ${nestedRepos.length} nested yarn.lock files during yarn run`,
    ),
  );

  const backedUp: string[] = [];
  try {
    // Back up nested lockfiles
    for (const repo of nestedRepos) {
      const lockPath = path.join(repo.path, 'yarn.lock');
      if (fs.existsSync(lockPath)) {
        fs.renameSync(lockPath, lockPath + '.bak');
        fs.createFileSync(lockPath);
        backedUp.push(repo.path);
      }
    }

    // Run the yarn command
    await execp(yarnCmd, true, false);
  } finally {
    // Restore nested lockfiles
    for (const repoPath of backedUp) {
      const lockPath = path.join(repoPath, 'yarn.lock');
      const bakPath = lockPath + '.bak';
      if (fs.existsSync(bakPath)) {
        if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
        fs.renameSync(bakPath, lockPath);
      }
    }
  }
}
