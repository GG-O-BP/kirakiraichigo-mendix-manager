import * as R from "ramda";
import { createContext, useContext } from "react";

const WidgetModalContext = createContext(null);

export function WidgetModalProvider({ children, value }) {
  return (
    <WidgetModalContext.Provider value={value}>
      {children}
    </WidgetModalContext.Provider>
  );
}

export function useWidgetModalContext() {
  const context = useContext(WidgetModalContext);
  if (R.isNil(context)) {
    throw new Error("useWidgetModalContext must be used within a WidgetModalProvider");
  }
  return context;
}
