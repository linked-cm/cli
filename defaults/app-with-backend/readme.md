# ${name}

A standalone [Linked](https://linked.cm) app generated with `@_linked/cli`.

## Storage

This app talks to an Apache Jena Fuseki SPARQL endpoint. Defaults:

- `FUSEKI_BASE_URL` — `http://localhost:3030`
- `FUSEKI_DATASET`  — `${hyphen_name}-main`
- `FUSEKI_USER` / `FUSEKI_PASSWORD` — `admin` / `admin` (matches the
  `stain/jena-fuseki` Docker image default)

Start a local Fuseki container:

```bash
docker run -d --rm -p 3030:3030 --name fuseki stain/jena-fuseki
```

The app auto-creates the `${hyphen_name}-main` dataset on first boot.
Set `FUSEKI_DB_TYPE=mem` for an in-memory dataset (data lost on restart),
or keep the default `tdb2` for persistent on-disk storage.

Edit `scripts/storage-config.js` to point at a different endpoint or to add
multiple datasets.

## Run

With npm:

```bash
npm install
npm start
```

Or with yarn:

```bash
yarn install
yarn start
```

> **Note:** if you scaffolded this app **inside an existing Yarn-workspace
> monorepo** (e.g. inside `create_now/packages/`), use `yarn install` —
> `npm install` walks up to the workspace root and may hit peer-dep
> conflicts there. Outside a workspace, either tool works.

The home page renders a small Person overview that demonstrates the
`@_linked` query DSL — see `src/components/PersonOverview.tsx` for the
list query and `src/components/PersonPreview.tsx` for the per-row
sub-query, optimistic update, and delete pattern.

## Build for production

```bash
npm run build
npm run server:prod
```

## Learn more

- [@_linked/core](https://www.npmjs.com/package/@_linked/core) — query DSL,
  Shape classes, storage routing.
- [@_linked/react](https://www.npmjs.com/package/@_linked/react) —
  `linkedComponent`, `linkedSetComponent`.
- [@_linked/schema](https://www.npmjs.com/package/@_linked/schema) — shipped
  Shape classes (Person, Place, Organization, …).
