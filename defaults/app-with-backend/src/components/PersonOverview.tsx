// Example PersonOverview — demonstrates the @_linked query DSL end-to-end:
// a linkedSetComponent runs the list query and each row delegates to a
// linkedComponent (PersonPreview). Add/delete/edit are demonstrated via
// Person.create / Person.update / Person.delete on the same dataset.
//
// Replace or extend this with your own shapes (see https://linked.cm).
import React, { useCallback, useState } from 'react';
import { linkedSetComponent } from '@_linked/react';
import { Person } from '@_linked/schema/shapes/Person';
import { PersonPreview } from './PersonPreview';
import { PersonListRefreshProvider } from './PersonOverviewContext';

const PersonList = linkedSetComponent(
  Person.query((p) => [p.givenName, p.familyName]),
  ({ linkedData }) => (
    <ul data-testid="person-list">
      {(linkedData || []).map((p) => (
        <li key={p.id}>
          <PersonPreview of={{ id: p.id }} />
        </li>
      ))}
    </ul>
  ),
);

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
  // Bumping `refreshKey` re-mounts <PersonList/> so the linkedSetComponent
  // re-runs its query after a mutation.
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
        <PersonList key={refreshKey} />
        <PersonAddForm onAdded={refresh} />
      </div>
    </PersonListRefreshProvider>
  );
}
