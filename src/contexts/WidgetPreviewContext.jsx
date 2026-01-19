import * as R from "ramda";
import { createContext, useContext } from "react";

const WidgetPreviewContext = createContext(null);

export function WidgetPreviewProvider({ children, value }) {
  return (
    <WidgetPreviewContext.Provider value={value}>
      {children}
    </WidgetPreviewContext.Provider>
  );
}

export function useWidgetPreviewContext() {
  const context = useContext(WidgetPreviewContext);
  if (R.isNil(context)) {
    throw new Error(
      "useWidgetPreviewContext must be used within a WidgetPreviewProvider",
    );
  }
  return context;
}

export default WidgetPreviewContext;
