import * as R from "ramda";
import { createContext, useContext } from "react";

const WidgetFormContext = createContext(null);

export function WidgetFormProvider({ children, value }) {
  return (
    <WidgetFormContext.Provider value={value}>
      {children}
    </WidgetFormContext.Provider>
  );
}

export function useWidgetFormContext() {
  const context = useContext(WidgetFormContext);
  if (R.isNil(context)) {
    throw new Error(
      "useWidgetFormContext must be used within a WidgetFormProvider",
    );
  }
  return context;
}

export default WidgetFormContext;
