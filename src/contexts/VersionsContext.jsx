import * as R from "ramda";
import { createContext, useContext } from "react";

const VersionsContext = createContext(null);

export function VersionsProvider({ children, value }) {
  return (
    <VersionsContext.Provider value={value}>
      {children}
    </VersionsContext.Provider>
  );
}

export function useVersionsContext() {
  const context = useContext(VersionsContext);
  if (R.isNil(context)) {
    throw new Error("useVersionsContext must be used within a VersionsProvider");
  }
  return context;
}
