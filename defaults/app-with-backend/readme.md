# ${name}

A standalone [Linked](https://linked.cm) app generated with `@_linked/cli`. Requires **Node ≥ 20.6**.

## What is Linked

Linked is a TypeScript framework for building apps on top of a graph database (RDF / SPARQL). You write your domain as **shape classes**, query them with a **typed DSL**, and render with **linked React components** that subscribe to the query results.

```ts
// 1. A shape — domain class + SHACL metadata, generated from TypeScript decorators
@linkedShape
export class Person extends Shape {
  static targetClass = schema.Person;

  @literalProperty({ path: schema.givenName })  givenName: string;
  @literalProperty({ path: schema.familyName }) familyName: string;
}

// 2. A query — TypeScript-embedded, type-inferred, executed against any IDataset
const people = await Person.select((p) => [p.givenName, p.familyName]);

// 3. A linked component — re-renders when its query result changes
const PersonCard = linkedComponent(
  Person.select((p) => [p.givenName, p.familyName]),
  ({ givenName, familyName }) => <span>{givenName} {familyName}</span>,
);
```

The home page in this app demonstrates the full chain end-to-end with `@_linked/schema`'s shipped `Person` shape.

- **[@_linked/core](https://github.com/linked-cm/core)** — query DSL, Shape classes, storage routing.
- **[@_linked/react](https://github.com/Semantu/linked-react)** — `linkedComponent`, `linkedSetComponent`.

## Install + run

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

The home page demonstrates the `@_linked` query DSL with a small Person CRUD — see `src/components/PersonOverview.tsx` and `src/components/PersonPreview.tsx`.

> If you scaffolded this app **inside an existing Yarn-workspace monorepo** (e.g. `packages/` of another repo), use `yarn install` — `npm install` walks up to the workspace root and may hit peer-dep conflicts there. Outside a workspace, either tool works.

## Storage

This app talks to an Apache Jena Fuseki SPARQL endpoint. Start a local Fuseki container:

```bash
docker run -d --rm -p 3030:3030 --name fuseki stain/jena-fuseki
```

The app auto-creates its dataset on first boot.

**Storage config lives in three files**, per the spec in [`@_linked/cli` docs](https://www.npmjs.com/package/@_linked/cli):

| File | Purpose |
|---|---|
| `linked.backend.datasets.json` | Backend Layer 2 — alias → store class + config. Gitignored. Copy of `linked.backend.datasets.example.json`. |
| `linked.backend.storage.ts` | Backend Layer 1 — shape → alias routing. Parses the JSON, instantiates stores via `loadStores`, calls `LinkedStorage.setDefaultDataset(...)` / `setDatasetForShapes(...)`. |
| `src/linked.frontend.{storage.ts,datasets.json}` | Frontend mirror — same JSON shape, public values only; storage TS imports store classes explicitly and constructs one per alias. |

Defaults shipped:

- `FUSEKI_BASE_URL` — `http://localhost:3030`
- `FUSEKI_DATASET`  — `${hyphen_name}-main`
- `FUSEKI_USER` / `FUSEKI_PASSWORD` — `admin` / `admin` (matches the `stain/jena-fuseki` Docker image default)
- `FUSEKI_DB_TYPE`  — `tdb2` (persistent). Set to `mem` for in-memory.

All of these are referenced as `${VAR:-default}` placeholders in `linked.backend.datasets.json`, so you can either edit the JSON directly or set env vars.

## Build for production

```bash
npm run build
npm run server:prod
```

## Learn more

- [@_linked/core](https://www.npmjs.com/package/@_linked/core) — query DSL, Shape classes, storage routing. See `parseDatasetsConfig` + `loadStores` for the dataset-config helpers.
- [@_linked/react](https://www.npmjs.com/package/@_linked/react) — `linkedComponent`, `linkedSetComponent`.
- [@_linked/schema](https://www.npmjs.com/package/@_linked/schema) — shipped Shape classes (Person, Place, Organization, …).
- [@_linked/css](https://www.npmjs.com/package/@_linked/css) — design tokens, Tailwind v4 theme primitives, `@utility` mixins. See `src/theme.css` for the wiring.
