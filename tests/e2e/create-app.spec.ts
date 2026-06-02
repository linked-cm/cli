// End-to-end: scaffold a Linked app via `linked create-app`, install, start it
// against a fresh Fuseki container, then drive the Person CRUD flow.
//
// Why scaffold inside the CN monorepo's packages/ rather than to /tmp:
// the template depends on unpublished `@_linked/*` packages. Inside the
// workspace, yarn resolves those locally via workspace symlinks. Outside
// the workspace they'd need to be published to npm first.
//
// Cleanup deletes the scaffolded folder + drops the Fuseki dataset.
import {test, expect} from '@playwright/test';
import {GenericContainer, Wait, StartedTestContainer} from 'testcontainers';
import {spawn, ChildProcess, execSync} from 'node:child_process';
import {rmSync, existsSync} from 'node:fs';
import {join, resolve} from 'node:path';

const CN_ROOT = resolve(__dirname, '../../../..');
const CLI_LAUNCH = resolve(__dirname, '../../lib/esm/launch.js');

// Deterministic-enough app name; salted so concurrent runs don't collide.
const APP_NAME = `e2e-test-app-${process.pid}`;
const APP_DIR = join(CN_ROOT, 'packages', APP_NAME);
const DATASET = `${APP_NAME}-main`;
const APP_PORT = 4400 + (process.pid % 100); // avoid collision with a CN backend on 4040

let fuseki: StartedTestContainer;
let appProc: ChildProcess | null = null;
let fusekiUrl: string;

test.beforeAll(async () => {
  // 1. Start a fresh Fuseki container with a random host port.
  fuseki = await new GenericContainer('stain/jena-fuseki')
    .withExposedPorts(3030)
    .withEnvironment({ADMIN_PASSWORD: 'admin'})
    .withWaitStrategy(Wait.forLogMessage(/Started.*Server/))
    .start();
  fusekiUrl = `http://${fuseki.getHost()}:${fuseki.getMappedPort(3030)}`;

  // 2. Scaffold the app via the new launch.js bin (loader-baked).
  if (existsSync(APP_DIR)) rmSync(APP_DIR, {recursive: true, force: true});
  execSync(
    `node ${CLI_LAUNCH} create-app ${APP_NAME} --app-name "E2E" --app-prefix e2e --app-domain e2e.local --skip-install`,
    {cwd: join(CN_ROOT, 'packages'), stdio: 'inherit'},
  );

  // 3. Create the matching dataset in Fuseki. Template default is
  // `${hyphen_name}-main` → matches DATASET above.
  const adminAuth = Buffer.from('admin:admin').toString('base64');
  const resp = await fetch(`${fusekiUrl}/$/datasets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${adminAuth}`,
    },
    body: `dbName=${DATASET}&dbType=mem`,
  });
  if (!resp.ok && resp.status !== 409) {
    throw new Error(`Failed to create dataset: ${resp.status} ${await resp.text()}`);
  }

  // 4. Install scaffolded app deps. Inside the CN workspace yarn resolves
  // @_linked/* via local symlinks.
  execSync('yarn install', {cwd: APP_DIR, stdio: 'inherit'});

  // 5. Boot the app with env overrides pointing at the testcontainer Fuseki.
  appProc = spawn('yarn', ['start'], {
    cwd: APP_DIR,
    env: {
      ...process.env,
      FUSEKI_BASE_URL: fusekiUrl,
      FUSEKI_DATASET: DATASET,
      PORT: String(APP_PORT),
    },
    stdio: 'inherit',
  });

  // 6. Wait for HTTP 200 on /.
  await waitForServer(`http://localhost:${APP_PORT}/`, 90_000);
}, /* timeout */ 4 * 60 * 1000);

test.afterAll(async () => {
  // Kill the app server.
  if (appProc) {
    appProc.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 1000));
    if (!appProc.killed) appProc.kill('SIGKILL');
  }

  // Drop the Fuseki dataset (idempotent).
  try {
    const adminAuth = Buffer.from('admin:admin').toString('base64');
    await fetch(`${fusekiUrl}/$/datasets/${DATASET}`, {
      method: 'DELETE',
      headers: {Authorization: `Basic ${adminAuth}`},
    });
  } catch {
    // Container may be gone already; ignore.
  }

  // Stop testcontainer.
  await fuseki?.stop().catch(() => {});

  // Remove scaffolded app folder.
  if (existsSync(APP_DIR)) rmSync(APP_DIR, {recursive: true, force: true});
}, /* timeout */ 2 * 60 * 1000);

test('Person fixture: add → edit → delete round-trip', async ({page}) => {
  await page.goto(`http://localhost:${APP_PORT}/`);
  await expect(page.getByTestId('person-overview')).toBeVisible();

  // Add Alice
  await page.getByPlaceholder('First name').fill('Alice');
  await page.getByPlaceholder('Last name').fill('Anderson');
  await page.getByRole('button', {name: 'Add'}).click();
  await expect(page.getByTestId('person-name').filter({hasText: 'Alice Anderson'})).toBeVisible();

  // Edit to Alicia
  await page.getByRole('button', {name: 'Edit'}).first().click();
  const editRow = page.getByTestId('person-edit').first();
  await editRow.getByLabel('First name').fill('Alicia');
  await editRow.getByRole('button', {name: 'Save'}).click();
  await expect(
    page.getByTestId('person-name').filter({hasText: 'Alicia Anderson'}),
  ).toBeVisible();

  // Reload — change must persist
  await page.reload();
  await expect(
    page.getByTestId('person-name').filter({hasText: 'Alicia Anderson'}),
  ).toBeVisible();

  // Delete — row disappears
  await page.getByRole('button', {name: 'Delete'}).first().click();
  await expect(
    page.getByTestId('person-name').filter({hasText: 'Alicia Anderson'}),
  ).toBeHidden();
});

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, {method: 'GET'});
      if (r.ok) return;
    } catch {
      /* not ready yet */
    }
    await new Promise((res) => setTimeout(res, 1000));
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`);
}
