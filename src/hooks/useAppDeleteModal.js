import * as R from "ramda";
import { useState, useCallback } from "react";

export function useAppDeleteModal() {
  const [showModal, setShowModal] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);

  const open = useCallback(
    R.pipe(
      R.tap(() => setShowModal(true)),
      R.tap(setAppToDelete),
    ),
    [],
  );

  const close = useCallback(
    R.pipe(
      R.tap(() => setShowModal(false)),
      R.tap(() => setAppToDelete(null)),
    ),
    [],
  );

  return {
    showModal,
    appToDelete,
    open,
    close,
  };
}
