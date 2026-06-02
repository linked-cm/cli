// Example PersonPreview — single-Person row. Demonstrates a per-row linked
// query (givenName + familyName), an optimistic in-place edit via local
// state, and Person.delete by id. Triggers the parent overview to re-run
// its list query via the refresh context.
import React, { useEffect, useState } from 'react';
import { Person } from '@_linked/schema/shapes/Person';
import { usePersonListRefresh } from './PersonOverviewContext';

type PreviewData = { id: string; givenName?: string; familyName?: string };

export function PersonPreview({ of }: { of: { id: string } }) {
  const refreshList = usePersonListRefresh();
  const [data, setData] = useState<PreviewData | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftGiven, setDraftGiven] = useState('');
  const [draftFamily, setDraftFamily] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Person.select((p) => [p.givenName, p.familyName])
      .where((p) => p.equals({ id: of.id }))
      .one()
      .then((row) => {
        if (cancelled || !row) return;
        setData(row as PreviewData);
        setDraftGiven(row.givenName ?? '');
        setDraftFamily(row.familyName ?? '');
      })
      .catch((err) => {
        if (!cancelled) console.error('PersonPreview load failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, [of.id]);

  async function save() {
    setBusy(true);
    try {
      await Person.update({
        givenName: draftGiven,
        familyName: draftFamily,
      }).for({ id: of.id });
      setData({ id: of.id, givenName: draftGiven, familyName: draftFamily });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await Person.delete({ id: of.id });
      refreshList();
    } finally {
      setBusy(false);
    }
  }

  if (data === null) return <span>…</span>;

  if (editing) {
    return (
      <span data-testid="person-edit">
        <input
          value={draftGiven}
          onChange={(e) => setDraftGiven(e.target.value)}
          aria-label="First name"
        />
        <input
          value={draftFamily}
          onChange={(e) => setDraftFamily(e.target.value)}
          aria-label="Last name"
        />
        <button onClick={save} disabled={busy}>
          Save
        </button>
        <button onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span data-testid="person-row">
      <span data-testid="person-name">
        {data.givenName} {data.familyName}
      </span>{' '}
      <button onClick={() => setEditing(true)} disabled={busy}>
        Edit
      </button>
      <button onClick={remove} disabled={busy}>
        Delete
      </button>
    </span>
  );
}
