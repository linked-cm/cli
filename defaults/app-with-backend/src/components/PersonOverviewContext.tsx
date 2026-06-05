// Small context that lets PersonPreview rows trigger a list refresh on
// their parent PersonOverview without prop-drilling through the
// linkedSetComponent's wrapped renderer.
import React, { useContext } from 'react';

const PersonListRefreshContext = React.createContext<() => void>(() => {});

export const PersonListRefreshProvider = PersonListRefreshContext.Provider;

export function usePersonListRefresh(): () => void {
  return useContext(PersonListRefreshContext);
}
