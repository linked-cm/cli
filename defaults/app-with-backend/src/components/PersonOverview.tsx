// Example PersonOverview — demonstrates @_linked/react's data binding:
// linkedSetComponent for the list (auto-runs the query, injects results and
// an injected _refresh); linkedComponent for each row (see PersonPreview).
// After Person.create the form calls _refresh() to re-run the list query.
//
// Replace or extend this with your own shapes (see https://linked.cm).
import React, { useCallback, useRef, useState } from 'react';
import { linkedSetComponent } from '@_linked/react';
import { Person } from '@_linked/schema/shapes/Person';
import { PersonPreview } from './PersonPreview';
import { PersonListRefreshProvider } from './PersonOverviewContext';
import style from './PersonOverview.module.css';

const PersonList = linkedSetComponent(
  Person.select((p) => [p.givenName, p.familyName]),
  ({ linkedData = [], _refresh, refreshRef }: any) => {
    // Forward the list's _refresh up via a ref so the sibling form +
    // child rows can trigger a re-fetch through context.
    if (refreshRef) {
      refreshRef.current = _refresh;
    }

    if (linkedData.length === 0) {
      return (
        <p className={style.Empty}>No people yet. Add one below.</p>
      );
    }

    return (
      <ul className={style.List} data-testid="person-list">
        {linkedData.map((p: { id: string }) => (
          <li key={p.id}>
            <PersonPreview of={{ id: p.id }} />
          </li>
        ))}
      </ul>
    );
  },
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
    <form className={style.Form} onSubmit={submit}>
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
  const refreshRef = useRef<() => void>(() => {});
  const refresh = useCallback(() => refreshRef.current(), []);

  return (
    <PersonListRefreshProvider value={refresh}>
      <div className={style.Root} data-testid="person-overview">
        <h2>People</h2>
        <p className={style.Intro}>
          Example code using the <code>@_linked</code> query DSL against
          your local Fuseki dataset. Edit{' '}
          <code>src/components/PersonOverview.tsx</code> to extend it.
        </p>
        <PersonList refreshRef={refreshRef} />
        <PersonAddForm onAdded={refresh} />
      </div>
    </PersonListRefreshProvider>
  );
}
