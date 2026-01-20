import * as R from "ramda";
import { createContext, useContext } from "react";

const AppContext = createContext(null);

export function AppProvider({ children, value }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (R.isNil(context)) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
