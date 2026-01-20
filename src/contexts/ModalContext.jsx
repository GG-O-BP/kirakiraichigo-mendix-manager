import * as R from "ramda";
import { createContext, useContext } from "react";

const ModalContext = createContext(null);

export function ModalProvider({ children, value }) {
  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
}

export function useModalContext() {
  const context = useContext(ModalContext);
  if (R.isNil(context)) {
    throw new Error("useModalContext must be used within a ModalProvider");
  }
  return context;
}
