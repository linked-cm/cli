// Example PersonPreview — single-Person row. Demonstrates @_linked/react's
// linkedComponent: the wrapper runs the per-row query and injects query
// result keys + `source` + `_refresh` into the render function. _refresh
// patches local query state for optimistic UI; on delete, the parent
// list re-runs via the PersonListRefresh context.
import React, { useState } from 'react';
import { linkedComponent } from '@_linked/react';
import { Person } from '@_linked/schema/shapes/Person';
import { usePersonListRefresh } from './PersonOverviewContext';
import style from './PersonPreview.module.css';

export const PersonPreview = linkedComponent(
  Person.select((p) => [p.givenName, p.familyName]),
  ({ givenName, familyName, source, _refresh }) => {
    const refreshList = usePersonListRefresh();
    const [editing, setEditing] = useState(false);
    const [draftGiven, setDraftGiven] = useState(givenName ?? '');
    const [draftFamily, setDraftFamily] = useState(familyName ?? '');
    const [busy, setBusy] = useState(false);

    async function save() {
      if (!source.id) return;
      setBusy(true);
      try {
        await Person.update({
          givenName: draftGiven,
          familyName: draftFamily,
        }).for({ id: source.id });
        // Optimistic patch — no extra network round-trip needed.
        _refresh({ givenName: draftGiven, familyName: draftFamily });
        setEditing(false);
      } finally {
        setBusy(false);
      }
    }

    async function remove() {
      if (!source.id) return;
      setBusy(true);
      try {
        await Person.delete({ id: source.id });
        refreshList();
      } finally {
        setBusy(false);
      }
    }

    function startEdit() {
      setDraftGiven(givenName ?? '');
      setDraftFamily(familyName ?? '');
      setEditing(true);
    }

    if (editing) {
      return (
        <span className={style.EditRow} data-testid="person-edit">
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
          <button
            className={style.SaveButton}
            onClick={save}
            disabled={busy}
          >
            Save
          </button>
          <button
            className={style.CancelButton}
            onClick={() => setEditing(false)}
            disabled={busy}
          >
            Cancel
          </button>
        </span>
      );
    }

    return (
      <span className={style.Row} data-testid="person-row">
        <span className={style.Name} data-testid="person-name">
          {givenName} {familyName}
        </span>
        <span className={style.Actions}>
          <button
            className={style.EditButton}
            onClick={startEdit}
            disabled={busy}
          >
            Edit
          </button>
          <button
            className={style.DeleteButton}
            onClick={remove}
            disabled={busy}
          >
            Delete
          </button>
        </span>
      </span>
    );
  },
);
