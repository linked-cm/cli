# api

The Linked backend: `@_linked/server` in API-only mode (`linked start --api-only`), with no web frontend. The
mobile app's `BackendAPIStore` sends DSL queries here; the generic `BackendAPIStoreProvider` forwards them to
Fuseki. Shapes come from `app-shapes`, which Vite loads from source in development.

## Run

```sh
cp services/api/.env.example services/api/.env   # once
npm run fuseki:up                                # from the repo root; Docker Compose Fuseki on :3030
npm run api                                      # API on :4000; GET / is 404 by design
```

`npm run api` checks that Fuseki answers first and exits with "Run `npm run fuseki:up`" if it does not.

**Port 3030 taken** (for example by another project's Fuseki): pick another host port in two places.
1. A root `.env` (gitignored; Docker Compose reads it automatically): `FUSEKI_PORT=3031`.
2. `services/api/.env`: `FUSEKI_BASE_URL=http://localhost:3031`.

The integration tests read `FUSEKI_BASE_URL`, or `FUSEKI_PORT`, from the shell environment
(`FUSEKI_PORT=3031 npm run test:integration`).

## Storage

- **Graph:** `linked.backend.datasets.json` configures the `appData` Fuseki store. `FUSEKI_DATASET` picks the
  dataset (`app-dev`) and `FUSEKI_DB_TYPE` its type (`tdb2`, or `mem` for tests); it is created on startup.
  The integration tests use the in-memory `app-test` dataset and reset it on every run.
- **Files:** a `LocalFileStore` in `<NODE_ENV>-files/` by default. When all of `AWS_ACCESS_KEY_ID`,
  `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_ENDPOINT` and `S3_FILES_BUCKET_NAME` are set, an `S3FileStore`
  (S3, or an S3-compatible service such as DigitalOcean Spaces) is used instead.

## Dependencies

`react-dom` is a direct dependency although the API renders no pages: `LinkedServer` imports `react-dom/server`
at load time, and the root React is 19.2.3 (for `apps/mobile`), so `@_linked/server`'s own `react-dom` 18 is
nested where Vite SSR cannot resolve it. Pinning `react-dom` 19.2.3 here hoists it next to the root React.

`linked start` finds the hoisted `app-shapes` workspace and runs in workspace mode: Vite loads `app-shapes` from
`src` through its `development` export condition, while published packages such as `@_linked/core` and
`@_linked/fuseki` stay external, so the stores `loadStores` imports share one core instance.

## Test

`npm test -w services/api` runs the unit tests with `node --test`.
