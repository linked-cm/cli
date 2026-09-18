import { describeComposePortFailure } from './integration/apiEnv';

describe('describeComposePortFailure', () => {
  test('docker not installed', () => {
    const error = Object.assign(new Error('spawnSync docker ENOENT'), { code: 'ENOENT' });
    expect(describeComposePortFailure({ error, status: null })).toMatch(/^Docker is not installed/);
  });

  test('docker compose unavailable', () => {
    const message = describeComposePortFailure({
      status: 1,
      stderr: "docker: 'compose' is not a docker command.\nSee 'docker --help'",
    });
    expect(message).toMatch(/^Docker Compose is not available/);
    expect(message).toContain('is not a docker command');
  });

  test('non-zero exit mentioning compose', () => {
    expect(describeComposePortFailure({ status: 125, stderr: 'unknown command: docker compose' })).toMatch(
      /^Docker Compose is not available/,
    );
  });

  test('service not running', () => {
    const message = describeComposePortFailure({ status: 1, stderr: 'service "fuseki" is not running' });
    expect(message).toMatch(/Compose Fuseki is not running/);
    expect(message).toContain('npm run fuseki:up');
  });

  test('exit 0 without a port counts as not running', () => {
    expect(describeComposePortFailure({ status: 0, stdout: '' })).toMatch(/Compose Fuseki is not running/);
  });
});
