# ${name}

A standalone [Linked](https://linked.cm) app generated with `@_linked/cli`.

## Storage

This app talks to an Apache Jena Fuseki SPARQL endpoint. Defaults:

- `FUSEKI_BASE_URL` — `http://localhost:3030`
- `FUSEKI_DATASET`  — `${hyphen_name}-main`

Start a local Fuseki container:

```bash
docker run -d --rm -p 3030:3030 --name fuseki stain/jena-fuseki
```

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
