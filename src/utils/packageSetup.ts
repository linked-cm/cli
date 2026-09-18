import path from 'path';

export type PackageSetupPlan = {
  packageManager: 'yarn' | 'npm';
  /** Contents for a `.yarnrc.yml` in the new package, or null when not needed. */
  yarnrc: string | null;
  installCommand: string;
  buildCommand: string;
};

/**
 * Plans the install + first build of a freshly scaffolded linked package.
 *
 * - Yarn 2+ defaults to Plug'n'Play, which leaves no node_modules. The build
 *   step shells out to `npx tsc` / `npx tsconfig-to-dual-package`, so the
 *   package is pinned to the node-modules linker. Yarn 1 ignores .yarnrc.yml.
 * - The build runs through the CLI that is currently executing (node + its own
 *   launch script) instead of `npm exec linked`, which cannot resolve a bin
 *   that a different package manager installed.
 */
export function planPackageSetup(
  yarnVersionOutput: string,
  launchScript: string,
  nodeBinary: string = process.execPath,
): PackageSetupPlan {
  const match = (yarnVersionOutput || '').trim().match(/^(\d+)\./);
  const yarnMajor = match ? parseInt(match[1], 10) : null;
  const packageManager = yarnMajor === null ? 'npm' : 'yarn';
  return {
    packageManager,
    yarnrc: yarnMajor !== null && yarnMajor >= 2 ? 'nodeLinker: node-modules\n' : null,
    installCommand: packageManager === 'yarn' ? 'yarn install' : 'npm install',
    buildCommand: `${JSON.stringify(nodeBinary)} ${JSON.stringify(path.resolve(launchScript))} build`,
  };
}
