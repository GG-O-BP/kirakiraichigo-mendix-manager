import { useState, useCallback } from "react";

export function useWidgetModal() {
  const [showModal, setShowModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const open = useCallback(() => setShowModal(true), []);
  const close = useCallback(() => setShowModal(false), []);

  return {
    showModal,
    setShowModal,
    showAddForm,
    setShowAddForm,
    open,
    close,
  };
}
