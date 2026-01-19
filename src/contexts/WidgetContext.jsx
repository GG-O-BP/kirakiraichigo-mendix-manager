import * as R from "ramda";
import { createContext, useContext } from "react";

const WidgetContext = createContext(null);

export function WidgetProvider({ children, value }) {
  return (
    <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>
  );
}

export function useWidgetContext() {
  const context = useContext(WidgetContext);
  if (R.isNil(context)) {
    throw new Error("useWidgetContext must be used within a WidgetProvider");
  }
  return context;
}

export default WidgetContext;
