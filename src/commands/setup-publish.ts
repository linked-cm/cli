import chalk from 'chalk';
import fs from 'fs-extra';
import path, {dirname} from 'path';
import {execp, execPromise} from '../utils.js';

const dirname__ =
  typeof __dirname !== 'undefined'
    ? __dirname
    : //@ts-ignore
      dirname(import.meta.url).replace('file:/', '');

// defaults/setup-publish/ lives at packages/cli/defaults/setup-publish/
// This file compiles to lib/{esm,cjs}/commands/setup-publish.js — go up three
// levels to reach the package root, then into defaults/setup-publish.
const TEMPLATE_DIR = path.resolve(dirname__, '..', '..', '..', 'defaults', 'setup-publish');

export type SetupPublishOptions = {
  configureGithub?: boolean;
  scope?: 'core' | 'community'; // which NPM secret name to use
};

/**
 * Set up a single-branch changesets publish workflow in the current package repo.
 *
 * Installs:
 * - .github/workflows/{ci,publish,changeset-check}.yml
 * - .changeset/config.json + README.md
 * - .changeset/initial-release.md
 * - .gitignore entries for node_modules, lib, yarn.lock, src-compiled-artifacts
 * - package.json: @changesets/cli + @changesets/changelog-github devDeps,
 *   publishConfig: {access: public}
 * - package-lock.json generated via npm install --package-lock-only
 *
 * With --configure-github: if `gh` CLI is available and authenticated, also sets
 * branch protection on main (strict + required "Build & Test" check).
 */
export async function setupPublish(opts: SetupPublishOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const scope = opts.scope || 'core';
  const npmSecretName = scope === 'community' ? 'NPM_AUTH_TOKEN_CM' : 'NPM_AUTH_TOKEN';

  console.log(chalk.magenta('Setting up single-branch publish workflow...'));
  console.log(`  target: ${cwd}`);
  console.log(`  npm secret: ${npmSecretName} (${scope})`);

  const pkgJsonPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    console.error(chalk.red('No package.json found in current directory. Run from the repo root.'));
    process.exit(1);
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const repoSlug = await resolveRepoSlug(cwd, pkgJson);

  console.log(`  repo: ${repoSlug}`);
  console.log('');

  // 1. Workflow files (with {{NPM_SECRET_NAME}} substitution in publish.yml)
  await copyWorkflows(cwd, npmSecretName);

  // 2. Changesets config + README
  await copyChangesetConfig(cwd, repoSlug);

  // 3. Initial changeset
  await writeInitialChangeset(cwd, pkgJson.name);

  // 4. .gitignore
  await updateGitignore(cwd);

  // 5. package.json patches
  await patchPackageJson(pkgJsonPath, pkgJson);

  // 6. npm install --package-lock-only to generate lockfile (if not present)
  await ensureLockfile(cwd);

  // 7. Optional: configure GitHub branch protection
  if (opts.configureGithub) {
    await configureGithub(repoSlug);
  }

  // Summary + manual steps
  printNextSteps(repoSlug, npmSecretName, opts.configureGithub);
}

async function resolveRepoSlug(cwd: string, pkgJson: any): Promise<string> {
  // Try git remote first
  try {
    const remoteUrl = await execPromise('git config --get remote.origin.url', false, false, {cwd});
    const m = typeof remoteUrl === 'string' ? remoteUrl.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?\s*$/) : null;
    if (m) return m[1];
  } catch {
    // fall through
  }
  // Fallback: parse package.json repository
  const repoField = pkgJson.repository;
  if (typeof repoField === 'string') {
    const m = repoField.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    if (m) return m[1];
  } else if (repoField?.url) {
    const m = repoField.url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    if (m) return m[1];
  }
  console.warn(chalk.yellow('Could not determine repo slug. Using placeholder "OWNER/REPO" — update .changeset/config.json manually.'));
  return 'OWNER/REPO';
}

async function copyWorkflows(cwd: string, npmSecretName: string): Promise<void> {
  const srcDir = path.join(TEMPLATE_DIR, 'github', 'workflows');
  const dstDir = path.join(cwd, '.github', 'workflows');
  fs.mkdirpSync(dstDir);

  for (const file of ['ci.yml', 'publish.yml', 'changeset-check.yml']) {
    let content = fs.readFileSync(path.join(srcDir, file), 'utf8');
    content = content.replace(/\{\{NPM_SECRET_NAME\}\}/g, npmSecretName);
    fs.writeFileSync(path.join(dstDir, file), content);
    console.log(chalk.green('  ✓') + ` .github/workflows/${file}`);
  }
}

async function copyChangesetConfig(cwd: string, repoSlug: string): Promise<void> {
  const srcDir = path.join(TEMPLATE_DIR, 'changeset');
  const dstDir = path.join(cwd, '.changeset');
  fs.mkdirpSync(dstDir);

  let configContent = fs.readFileSync(path.join(srcDir, 'config.json'), 'utf8');
  configContent = configContent.replace(/\{\{REPO_SLUG\}\}/g, repoSlug);
  fs.writeFileSync(path.join(dstDir, 'config.json'), configContent);
  console.log(chalk.green('  ✓') + ' .changeset/config.json');

  fs.copyFileSync(path.join(srcDir, 'README.md'), path.join(dstDir, 'README.md'));
  console.log(chalk.green('  ✓') + ' .changeset/README.md');
}

async function writeInitialChangeset(cwd: string, pkgName: string): Promise<void> {
  const changelogPath = path.join(cwd, 'CHANGELOG.md');
  if (fs.existsSync(changelogPath)) {
    console.log(chalk.gray('  · CHANGELOG.md exists — skipping initial changeset'));
    return;
  }
  const initial = path.join(cwd, '.changeset', 'initial-release.md');
  const body = `---\n'${pkgName}': patch\n---\n\nInitial release under the new publishing setup.\n`;
  fs.writeFileSync(initial, body);
  console.log(chalk.green('  ✓') + ' .changeset/initial-release.md');
}

async function updateGitignore(cwd: string): Promise<void> {
  const gitignorePath = path.join(cwd, '.gitignore');
  const entries = [
    'node_modules/',
    'lib/',
    'yarn.lock',
    '*.log',
    '.DS_Store',
    '',
    '# Compiled artifacts should only live in lib/, never under src/',
    'src/**/*.js',
    'src/**/*.js.map',
    'src/**/*.d.ts',
  ];
  const existing = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf8').split('\n')
    : [];
  const existingSet = new Set(existing.map((l) => l.trim()));
  const toAdd = entries.filter((e) => e && !existingSet.has(e.trim()));
  if (toAdd.length === 0) {
    console.log(chalk.gray('  · .gitignore already has all entries'));
    return;
  }
  const merged = [
    ...existing.filter((l) => l.trim() !== ''),
    '',
    ...entries,
  ].join('\n');
  fs.writeFileSync(gitignorePath, merged + '\n');
  console.log(chalk.green('  ✓') + ' .gitignore');
}

async function patchPackageJson(pkgJsonPath: string, pkgJson: any): Promise<void> {
  let modified = false;

  if (!pkgJson.publishConfig) {
    pkgJson.publishConfig = {access: 'public'};
    modified = true;
  } else if (pkgJson.publishConfig.access !== 'public') {
    pkgJson.publishConfig.access = 'public';
    modified = true;
  }

  pkgJson.devDependencies = pkgJson.devDependencies || {};
  if (!pkgJson.devDependencies['@changesets/cli']) {
    pkgJson.devDependencies['@changesets/cli'] = '^2.29.8';
    modified = true;
  }
  if (!pkgJson.devDependencies['@changesets/changelog-github']) {
    pkgJson.devDependencies['@changesets/changelog-github'] = '^0.5.2';
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
    console.log(chalk.green('  ✓') + ' package.json (publishConfig + changesets devDeps)');
  } else {
    console.log(chalk.gray('  · package.json already configured'));
  }
}

async function ensureLockfile(cwd: string): Promise<void> {
  if (fs.existsSync(path.join(cwd, 'package-lock.json'))) {
    console.log(chalk.gray('  · package-lock.json already exists'));
    return;
  }
  console.log(chalk.magenta('  Running npm install --package-lock-only...'));

  // When running inside a yarn workspace (e.g. CN's packages/* layout), npm
  // climbs up, detects the parent workspace, and writes the lockfile at the
  // wrong level. Work around by copying the package to a tmpdir, generating
  // the lockfile in isolation, and copying it back.
  const os = await import('os');
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'linked-setup-'));
  try {
    const pkgJsonPath = path.join(cwd, 'package.json');
    fs.copyFileSync(pkgJsonPath, path.join(tmpBase, 'package.json'));
    await execp('npm install --legacy-peer-deps --package-lock-only', false, true, {cwd: tmpBase});
    const lockPath = path.join(tmpBase, 'package-lock.json');
    if (fs.existsSync(lockPath)) {
      fs.copyFileSync(lockPath, path.join(cwd, 'package-lock.json'));
      console.log(chalk.green('  ✓') + ' package-lock.json');
    } else {
      console.warn(chalk.yellow('  ⚠ npm install did not produce a package-lock.json. Run it manually.'));
    }
  } catch (err) {
    console.warn(chalk.yellow('  ⚠ Failed to generate package-lock.json automatically. Run `npm install --package-lock-only` in a clean checkout of this repo.'));
  } finally {
    fs.removeSync(tmpBase);
  }
}

async function configureGithub(repoSlug: string): Promise<void> {
  console.log('');
  console.log(chalk.magenta('Configuring GitHub (branch protection)...'));

  // Check gh CLI available
  try {
    await execPromise('gh --version', false, false);
  } catch {
    console.warn(chalk.yellow('  ⚠ `gh` CLI not found. Install from https://cli.github.com/ and retry with --configure-github,'));
    console.warn(chalk.yellow('    or set branch protection manually at https://github.com/' + repoSlug + '/settings/branches'));
    return;
  }

  // Check gh CLI authenticated
  try {
    await execPromise('gh auth status', false, false);
  } catch {
    console.warn(chalk.yellow('  ⚠ `gh` CLI is not authenticated. Run `gh auth login` and retry.'));
    return;
  }

  const payload = JSON.stringify({
    required_status_checks: {strict: true, contexts: ['Build & Test']},
    enforce_admins: false,
    required_pull_request_reviews: null,
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
  });

  try {
    // Use --input - to pass the JSON payload via stdin
    await execPromise(
      `echo '${payload.replace(/'/g, "'\\''")}' | gh api -X PUT /repos/${repoSlug}/branches/main/protection --input -`,
      false,
      false,
    );
    console.log(chalk.green('  ✓') + ` branch protection enabled on ${repoSlug}/main`);
  } catch (err) {
    console.warn(chalk.yellow('  ⚠ Failed to set branch protection. Do it manually:'));
    console.warn(chalk.yellow(`    https://github.com/${repoSlug}/settings/branches`));
  }
}

function printNextSteps(repoSlug: string, npmSecretName: string, configuredGithub: boolean | undefined): void {
  console.log('');
  console.log(chalk.green('Done.'));
  console.log('');
  console.log(chalk.bold('Next steps:'));
  console.log('');
  console.log(`  1. Review the generated files, adjust as needed.`);
  console.log(`  2. Commit:`);
  console.log(chalk.cyan('       git add . && git commit -m "set up single-branch publish workflow"'));
  console.log(`  3. Push to main — the publish workflow will trigger.`);
  console.log('');
  console.log(chalk.bold('One-time org-level setup (if not already done):'));
  console.log('');
  console.log(`  a. Create an org secret ${chalk.cyan(npmSecretName)} with a granular npm token`);
  console.log(`     (2FA-bypass, write access to the @_linked* scope).`);
  console.log(`     → https://github.com/organizations/${repoSlug.split('/')[0]}/settings/secrets/actions`);
  console.log('');
  console.log(`  b. Enable "Allow GitHub Actions to create and approve pull requests":`);
  console.log(`     → https://github.com/organizations/${repoSlug.split('/')[0]}/settings/actions`);

  if (!configuredGithub) {
    console.log('');
    console.log(chalk.bold('Branch protection:'));
    console.log(`  Rerun with ${chalk.cyan('linked setup-publish --configure-github')} to configure automatically,`);
    console.log(`  or set manually at https://github.com/${repoSlug}/settings/branches`);
  }
  console.log('');
}
