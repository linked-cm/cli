import { apiUrl, resolveApiUrl } from '../src/shell/env';

// Explicit, so the module-level resolution does not depend on jest-expo's expo-constants mock.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { apiUrl: null, apiPort: 4000 }, hostUri: '192.168.1.5:8081' } },
}));

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

  test('ignores a non-string apiUrl (the dev-client manifest turns null into {})', () => {
    expect(resolveApiUrl({ extra: { apiUrl: {}, apiPort: 4000 }, hostUri: '192.168.1.5:8081' })).toBe(
      'http://192.168.1.5:4000',
    );
  });

  test('falls back to localhost', () => {
    expect(resolveApiUrl({ extra: { apiUrl: null, apiPort: 4000 }, hostUri: undefined })).toBe(
      'http://localhost:4000',
    );
  });

  test('sets process.env', () => {
    expect(apiUrl).toBe('http://192.168.1.5:4000');
    expect(process.env.SITE_ROOT).toBe(apiUrl);
    expect(process.env.DATA_ROOT).toBe(`${apiUrl}/data`);
  });
});
