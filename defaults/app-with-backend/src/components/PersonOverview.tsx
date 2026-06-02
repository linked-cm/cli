// Example PersonOverview — demonstrates the @_linked query DSL end-to-end:
// runs an awaited Person.select(...) to fetch the list, renders each row as a
// PersonPreview, and exposes add/edit/delete via Person.create / Person.update /
// Person.delete. After any mutation, bumping `refreshKey` re-runs the list.
//
// Replace or extend this with your own shapes (see https://linked.cm).
import React, { useCallback, useEffect, useState } from 'react';
import { Person } from '@_linked/schema/shapes/Person';
import { PersonPreview } from './PersonPreview';
import { PersonListRefreshProvider } from './PersonOverviewContext';

type PersonRow = { id: string; givenName?: string; familyName?: string };

function PersonList({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<PersonRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Person.select((p) => [p.givenName, p.familyName])
      .then((results) => {
        if (!cancelled) setRows(results as PersonRow[]);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('PersonList load failed', err);
          setRows([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (rows === null) return <p>Loading…</p>;
  if (rows.length === 0) return <p>No people yet. Add one below.</p>;

  return (
    <ul data-testid="person-list">
      {rows.map((p) => (
        <li key={p.id}>
          <PersonPreview of={{ id: p.id }} />
        </li>
      ))}
    </ul>
  );
}

function PersonAddForm({ onAdded }: { onAdded: () => void }) {
  const [given, setGiven] = useState('');
  const [family, setFamily] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!given && !family) return;
    setBusy(true);
    try {
      await Person.create({ givenName: given, familyName: family });
      setGiven('');
      setFamily('');
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <input
        value={given}
        placeholder="First name"
        onChange={(e) => setGiven(e.target.value)}
      />
      <input
        value={family}
        placeholder="Last name"
        onChange={(e) => setFamily(e.target.value)}
      />
      <button type="submit" disabled={busy}>
        Add
      </button>
    </form>
  );
}

export function PersonOverview() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <PersonListRefreshProvider value={refresh}>
      <div data-testid="person-overview">
        <h2>People</h2>
        <p>
          This is example code using the <code>@_linked</code> query DSL
          against your local Fuseki dataset. Edit{' '}
          <code>src/components/PersonOverview.tsx</code> to extend it.
        </p>
        <PersonList refreshKey={refreshKey} />
        <PersonAddForm onAdded={refresh} />
      </div>
    </PersonListRefreshProvider>
  );
}
