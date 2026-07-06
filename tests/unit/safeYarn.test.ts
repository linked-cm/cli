// Verifies that safeYarn honours LINKED_YARN_DRY_RUN=1 — it logs the would-be
// command and the parsed args, then returns without executing yarn or
// touching mrgit-related lockfiles. Covers a deferred gap from
// docs/backlog/010-cli-test-harness.md.
import {safeYarn} from '../../src/commands/safe-yarn.js';

describe('safeYarn (dry-run)', () => {
  const originalEnv = process.env.LINKED_YARN_DRY_RUN;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.LINKED_YARN_DRY_RUN = '1';
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.LINKED_YARN_DRY_RUN;
    } else {
      process.env.LINKED_YARN_DRY_RUN = originalEnv;
    }
    logSpy.mockRestore();
  });

  test('passes a plain install through', async () => {
    await safeYarn(['install']);
    const joined = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(joined).toMatch(/yarn install/);
    expect(joined).toMatch(/\["install"\]/);
  });

  test('preserves multi-word args', async () => {
    await safeYarn(['workspace', '@_linked/core', 'build']);
    const joined = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(joined).toMatch(/yarn workspace @_linked\/core build/);
    expect(joined).toMatch(/\["workspace","@_linked\/core","build"\]/);
  });

  test('preserves --flag style args', async () => {
    await safeYarn(['install', '--immutable']);
    const joined = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(joined).toMatch(/yarn install --immutable/);
  });

  test('preserves quoted-style empty args list', async () => {
    await safeYarn([]);
    const joined = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(joined).toMatch(/would execute: yarn /);
    expect(joined).toMatch(/\[\]/);
  });

  test('returns synchronously without throwing on minimal args', async () => {
    await expect(safeYarn(['--version'])).resolves.toBeUndefined();
  });
});
