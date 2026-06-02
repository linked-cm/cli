// Example PersonPreview — single-Person row. Demonstrates a per-row linked
// query (firstName + lastName), optimistic UI via _refresh(...) on update,
// and Person.delete by id. Notifies the parent overview to re-run its list
// query via the refresh context.
import React, { useState } from 'react';
import { linkedComponent } from '@_linked/react';
import { Person } from '@_linked/schema/shapes/Person';
import { usePersonListRefresh } from './PersonOverviewContext';

export const PersonPreview = linkedComponent(
  Person.query((p) => [p.givenName, p.familyName]),
  ({ givenName, familyName, source, _refresh }) => {
    const refreshList = usePersonListRefresh();
    const [editing, setEditing] = useState(false);
    const [draftGiven, setDraftGiven] = useState(givenName ?? '');
    const [draftFamily, setDraftFamily] = useState(familyName ?? '');
    const [busy, setBusy] = useState(false);

    async function save() {
      setBusy(true);
      try {
        // Optimistic patch — UI reflects new name immediately.
        _refresh({ givenName: draftGiven, familyName: draftFamily });
        await Person.update({
          givenName: draftGiven,
          familyName: draftFamily,
        }).for({ id: source.id });
        setEditing(false);
      } finally {
        setBusy(false);
      }
    }

    async function remove() {
      setBusy(true);
      try {
        await Person.delete({ id: source.id });
        refreshList();
      } finally {
        setBusy(false);
      }
    }

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
          {givenName} {familyName}
        </span>{' '}
        <button onClick={() => setEditing(true)} disabled={busy}>
          Edit
        </button>
        <button onClick={remove} disabled={busy}>
          Delete
        </button>
      </span>
    );
  },
);
