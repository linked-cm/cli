import { apiUrl, resolveApiUrl } from '../src/shell/env';

describe('resolveApiUrl', () => {
  test('explicit url wins', () => {
    expect(
      resolveApiUrl({ extra: { apiUrl: 'http://api.test:9000', apiPort: 4000 }, hostUri: '192.168.1.5:8081' }),
    ).toBe('http://api.test:9000');
  });

  test('derives from hostUri', () => {
    expect(resolveApiUrl({ extra: { apiUrl: null, apiPort: 4000 }, hostUri: '192.168.1.5:8081' })).toBe(
      'http://192.168.1.5:4000',
    );
  });

  test('falls back to localhost', () => {
    expect(resolveApiUrl({ extra: { apiUrl: null, apiPort: 4000 }, hostUri: undefined })).toBe(
      'http://localhost:4000',
    );
  });

  test('sets process.env', () => {
    expect(process.env.SITE_ROOT).toBe(apiUrl);
    expect(process.env.DATA_ROOT).toBe(`${apiUrl}/data`);
  });
});
