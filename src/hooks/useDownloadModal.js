import * as R from "ramda";
import { useState, useCallback } from "react";

const isValidVersion = R.both(
  R.complement(R.isNil),
  R.pipe(R.prop("version"), R.complement(R.isNil)),
);

export function useDownloadModal() {
  const [showModal, setShowModal] = useState(false);
  const [versionToDownload, setVersionToDownload] = useState(null);

  const open = useCallback(
    R.ifElse(
      isValidVersion,
      R.pipe(
        R.tap(setVersionToDownload),
        R.tap(() => setShowModal(true)),
      ),
      () => alert("Invalid version data"),
    ),
    [],
  );

  const close = useCallback(
    () =>
      R.pipe(
        R.tap(() => setShowModal(false)),
        R.tap(() => setVersionToDownload(null)),
      )(null),
    [],
  );

  return {
    showModal,
    versionToDownload,
    open,
    close,
  };
}
