import { useState, useCallback } from "react";

export function useWidgetModal() {
  const [showModal, setShowModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const open = useCallback(() => setShowModal(true), []);
  const close = useCallback(() => setShowModal(false), []);
  const openAddForm = useCallback(() => setShowAddForm(true), []);
  const closeAddForm = useCallback(() => setShowAddForm(false), []);

  return {
    showModal,
    setShowModal,
    showAddForm,
    setShowAddForm,
    open,
    close,
    openAddForm,
    closeAddForm,
  };
}
