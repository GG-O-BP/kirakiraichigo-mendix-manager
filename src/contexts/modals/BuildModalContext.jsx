import * as R from "ramda";
import { createContext, useContext } from "react";

const BuildModalContext = createContext(null);

export function BuildModalProvider({ children, value }) {
  return (
    <BuildModalContext.Provider value={value}>
      {children}
    </BuildModalContext.Provider>
  );
}

export function useBuildModalContext() {
  const context = useContext(BuildModalContext);
  if (R.isNil(context)) {
    throw new Error("useBuildModalContext must be used within a BuildModalProvider");
  }
  return context;
}

export default BuildModalContext;
