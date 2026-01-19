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
        const relatedApps = await invoke("get_apps_by_version", {
          version: version.version,
        });
        setShowUninstallModal(true);
        setVersionToUninstall(version);
        setRelatedApps(relatedApps);
      },
    ),
    [],
  );

  const closeUninstallModal = useCallback(() => {
    setShowUninstallModal(false);
    setVersionToUninstall(null);
    setRelatedApps([]);
  }, []);

  // App Delete Modal handlers
  const openAppDeleteModal = useCallback((app) => {
    setShowAppDeleteModal(true);
    setAppToDelete(app);
  }, []);

  const closeAppDeleteModal = useCallback(() => {
    setShowAppDeleteModal(false);
    setAppToDelete(null);
  }, []);

  // Widget Delete Modal handlers
  const openWidgetDeleteModal = useCallback((widget) => {
    setShowWidgetDeleteModal(true);
    setWidgetToDelete(widget);
  }, []);

  const closeWidgetDeleteModal = useCallback(() => {
    setShowWidgetDeleteModal(false);
    setWidgetToDelete(null);
  }, []);

  // Download Modal handlers
  const openDownloadModal = useCallback((version) => {
    if (!version || !version.version) {
      alert("Invalid version data");
      return;
    }
    setVersionToDownload(version);
    setShowDownloadModal(true);
  }, []);

  const closeDownloadModal = useCallback(() => {
    setShowDownloadModal(false);
    setVersionToDownload(null);
  }, []);

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
