import * as R from "ramda";
import { createContext, useContext } from "react";

const BuildDeployContext = createContext(null);

export function BuildDeployProvider({ children, value }) {
  return (
    <BuildDeployContext.Provider value={value}>
      {children}
    </BuildDeployContext.Provider>
  );
}

export function useBuildDeployContext() {
  const context = useContext(BuildDeployContext);
  if (R.isNil(context)) {
    throw new Error(
      "useBuildDeployContext must be used within a BuildDeployProvider",
    );
  }
  return context;
}
