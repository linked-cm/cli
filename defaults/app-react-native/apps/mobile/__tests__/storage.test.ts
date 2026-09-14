// Importing storage alone must be enough: it pulls ./env, so SITE_ROOT is set before BackendAPIStore is constructed.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { apiUrl: 'http://api.test:9000', apiPort: 4000 } } },
}));

const constructedWith: (string | undefined)[] = [];
jest.mock('@_linked/server/shapes/quadstores/BackendAPIStore', () => ({
  BackendAPIStore: class {
    constructor() {
      constructedWith.push(process.env.SITE_ROOT);
    }
  },
}));

test('importing src/shell/storage sets SITE_ROOT before BackendAPIStore is constructed', () => {
  delete process.env.SITE_ROOT;
  delete process.env.DATA_ROOT;

  require('../src/shell/storage');

  expect(constructedWith).toEqual(['http://api.test:9000']);
  expect(process.env.DATA_ROOT).toBe('http://api.test:9000/data');
});
