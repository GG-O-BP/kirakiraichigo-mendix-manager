import * as R from "ramda";
import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { wrapAsync } from "../utils";

export function useUninstallModal() {
  const [showModal, setShowModal] = useState(false);
  const [versionToUninstall, setVersionToUninstall] = useState(null);
  const [relatedApps, setRelatedApps] = useState([]);

  const open = useCallback(
    wrapAsync(
      (error) => alert(`Failed to get related apps: ${error}`),
      async (version) => {
        const versionId = R.prop("version", version);
        const apps = await invoke("get_apps_by_version", { version: versionId });
        setShowModal(true);
        setVersionToUninstall(version);
        setRelatedApps(apps);
      },
    ),
    [],
  );

  const close = useCallback(
    () =>
      R.pipe(
        R.tap(() => setShowModal(false)),
        R.tap(() => setVersionToUninstall(null)),
        R.tap(() => setRelatedApps([])),
      )(null),
    [],
  );

  return {
    showModal,
    versionToUninstall,
    relatedApps,
    setRelatedApps,
    open,
    close,
  };
}
