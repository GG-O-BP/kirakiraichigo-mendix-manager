import * as R from "ramda";
import { createContext, useContext } from "react";

const AppModalContext = createContext(null);

export function AppModalProvider({ children, value }) {
  return (
    <AppModalContext.Provider value={value}>
      {children}
    </AppModalContext.Provider>
  );
}

export function useAppModalContext() {
  const context = useContext(AppModalContext);
  if (R.isNil(context)) {
    throw new Error("useAppModalContext must be used within an AppModalProvider");
  }
  return context;
}
