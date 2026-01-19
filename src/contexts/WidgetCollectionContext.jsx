import * as R from "ramda";
import { createContext, useContext } from "react";

const WidgetCollectionContext = createContext(null);

export function WidgetCollectionProvider({ children, value }) {
  return (
    <WidgetCollectionContext.Provider value={value}>
      {children}
    </WidgetCollectionContext.Provider>
  );
}

export function useWidgetCollectionContext() {
  const context = useContext(WidgetCollectionContext);
  if (R.isNil(context)) {
    throw new Error(
      "useWidgetCollectionContext must be used within a WidgetCollectionProvider",
    );
  }
  return context;
}

export default WidgetCollectionContext;
