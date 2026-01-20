import * as R from "ramda";
import { useState, useCallback } from "react";

export function useWidgetDeleteModal() {
  const [showModal, setShowModal] = useState(false);
  const [widgetToDelete, setWidgetToDelete] = useState(null);

  const open = useCallback(
    R.pipe(
      R.tap(() => setShowModal(true)),
      R.tap(setWidgetToDelete),
    ),
    [],
  );

  const close = useCallback(
    () =>
      R.pipe(
        R.tap(() => setShowModal(false)),
        R.tap(() => setWidgetToDelete(null)),
      )(null),
    [],
  );

  return {
    showModal,
    widgetToDelete,
    open,
    close,
  };
}
