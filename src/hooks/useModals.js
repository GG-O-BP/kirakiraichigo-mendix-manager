import * as R from "ramda";
import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { wrapAsync } from "../utils/functional";

export function useModals() {
  // Uninstall Modal
  const [showUninstallModal, setShowUninstallModal] = useState(false);
  const [versionToUninstall, setVersionToUninstall] = useState(null);
  const [relatedApps, setRelatedApps] = useState([]);

  // App Delete Modal
  const [showAppDeleteModal, setShowAppDeleteModal] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);

  // Widget Modal
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [showAddWidgetForm, setShowAddWidgetForm] = useState(false);

  // Widget Delete Modal
  const [showWidgetDeleteModal, setShowWidgetDeleteModal] = useState(false);
  const [widgetToDelete, setWidgetToDelete] = useState(null);

  // Download Modal
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [versionToDownload, setVersionToDownload] = useState(null);

  // Result Modal
  const [showResultModal, setShowResultModal] = useState(false);

  // Uninstall Modal handlers
  const openUninstallModal = useCallback(
    wrapAsync(
      (error) => alert(`Failed to get related apps: ${error}`),
      async (version) => {
        const versionId = R.prop("version", version);
        const relatedApps = await invoke("get_apps_by_version", { version: versionId });
        setShowUninstallModal(true);
        setVersionToUninstall(version);
        setRelatedApps(relatedApps);
      },
    ),
    [],
  );

  const closeUninstallModal = useCallback(
    R.pipe(
      R.tap(() => setShowUninstallModal(false)),
      R.tap(() => setVersionToUninstall(null)),
      R.tap(() => setRelatedApps([])),
    ),
    [],
  );

  // App Delete Modal handlers
  const openAppDeleteModal = useCallback(
    R.pipe(
      R.tap(() => setShowAppDeleteModal(true)),
      R.tap(setAppToDelete),
    ),
    [],
  );

  const closeAppDeleteModal = useCallback(
    R.pipe(
      R.tap(() => setShowAppDeleteModal(false)),
      R.tap(() => setAppToDelete(null)),
    ),
    [],
  );

  // Widget Delete Modal handlers
  const openWidgetDeleteModal = useCallback(
    R.pipe(
      R.tap(() => setShowWidgetDeleteModal(true)),
      R.tap(setWidgetToDelete),
    ),
    [],
  );

  const closeWidgetDeleteModal = useCallback(
    R.pipe(
      R.tap(() => setShowWidgetDeleteModal(false)),
      R.tap(() => setWidgetToDelete(null)),
    ),
    [],
  );

  // Download Modal handlers
  const isValidVersion = R.both(
    R.complement(R.isNil),
    R.pipe(R.prop("version"), R.complement(R.isNil)),
  );

  const openDownloadModal = useCallback(
    R.ifElse(
      isValidVersion,
      R.pipe(
        R.tap(setVersionToDownload),
        R.tap(() => setShowDownloadModal(true)),
      ),
      () => alert("Invalid version data"),
    ),
    [],
  );

  const closeDownloadModal = useCallback(
    R.pipe(
      R.tap(() => setShowDownloadModal(false)),
      R.tap(() => setVersionToDownload(null)),
    ),
    [],
  );

  return {
    // Uninstall Modal
    showUninstallModal,
    versionToUninstall,
    relatedApps,
    setRelatedApps,
    openUninstallModal,
    closeUninstallModal,

    // App Delete Modal
    showAppDeleteModal,
    appToDelete,
    openAppDeleteModal,
    closeAppDeleteModal,

    // Widget Modal
    showWidgetModal,
    showAddWidgetForm,
    setShowWidgetModal,
    setShowAddWidgetForm,

    // Widget Delete Modal
    showWidgetDeleteModal,
    widgetToDelete,
    openWidgetDeleteModal,
    closeWidgetDeleteModal,

    // Download Modal
    showDownloadModal,
    versionToDownload,
    openDownloadModal,
    closeDownloadModal,

    // Result Modal
    showResultModal,
    setShowResultModal,
  };
}

export default useModals;
