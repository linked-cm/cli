import {hmrPortFor} from '../../src/vite-config';

// Each app needs its own HMR websocket port: they all used to share Vite's
// default 24678, so two dev servers at once collided. The port is derived from
// the dev port, which comes from `process.env.PORT` and is therefore untrusted.

describe('hmrPortFor', () => {
  test('the default dev port keeps Vite’s default HMR port', () => {
    expect(hmrPortFor(4040)).toBe(24678);
  });

  test('a neighbouring dev port gives a neighbouring HMR port', () => {
    expect(hmrPortFor(4041)).toBe(24679);
    expect(hmrPortFor(4039)).toBe(24677);
  });

  test('distinct dev ports always give distinct HMR ports', () => {
    const ports = [4040, 4041, 4042, 8080].map(hmrPortFor);
    expect(new Set(ports).size).toBe(ports.length);
  });

  test('a PORT env string is parsed and stays in range', () => {
    const port = hmrPortFor('8080');
    expect(port).toBe(24678 + (8080 - 4040));
    expect(port).toBeGreaterThanOrEqual(1024);
    expect(port).toBeLessThanOrEqual(65535);
  });

  test('a non-numeric PORT falls back to the dev port default', () => {
    expect(hmrPortFor('abc')).toBe(24678);
    expect(hmrPortFor(NaN)).toBe(24678);
    expect(hmrPortFor(undefined)).toBe(24678);
    expect(hmrPortFor('')).toBe(24678);
  });

  test('out-of-range and non-integer dev ports fall back to the default', () => {
    expect(hmrPortFor(0)).toBe(24678);
    expect(hmrPortFor(-1)).toBe(24678);
    expect(hmrPortFor(70000)).toBe(24678);
    expect(hmrPortFor(4040.5)).toBe(24678);
    expect(hmrPortFor(Infinity)).toBe(24678);
  });

  test('a derivation past the TCP ceiling is clamped', () => {
    // 60000 would derive 80638.
    expect(hmrPortFor(60000)).toBe(65535);
  });

  test('every valid dev port derives a bindable HMR port', () => {
    for (const devPort of [1, 80, 1024, 4040, 40897, 65535]) {
      const port = hmrPortFor(devPort);
      expect(port).toBeGreaterThanOrEqual(1024);
      expect(port).toBeLessThanOrEqual(65535);
    }
  });
});
