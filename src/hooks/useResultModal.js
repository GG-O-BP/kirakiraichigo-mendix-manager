import { useState, useCallback } from "react";

export function useResultModal() {
  const [showModal, setShowModal] = useState(false);

  const open = useCallback(() => setShowModal(true), []);
  const close = useCallback(() => setShowModal(false), []);

  return {
    showModal,
    setShowModal,
    open,
    close,
  };
}
