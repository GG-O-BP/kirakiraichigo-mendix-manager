import * as R from "ramda";
import { createContext, useContext } from "react";

const StudioProModalContext = createContext(null);

export function StudioProModalProvider({ children, value }) {
  return (
    <StudioProModalContext.Provider value={value}>
      {children}
    </StudioProModalContext.Provider>
  );
}

export function useStudioProModalContext() {
  const context = useContext(StudioProModalContext);
  if (R.isNil(context)) {
    throw new Error("useStudioProModalContext must be used within a StudioProModalProvider");
  }
  return context;
}

export default StudioProModalContext;
