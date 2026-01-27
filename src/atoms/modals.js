import * as R from "ramda";
import { atom } from "jotai";
import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { wrapAsync } from "../utils";

// ===== State Atoms =====

// Uninstall Modal
export const showUninstallModalAtom = atom(false);
export const versionToUninstallAtom = atom(null);
export const relatedAppsAtom = atom([]);

// Download Modal
export const showDownloadModalAtom = atom(false);
export const versionToDownloadAtom = atom(null);

// App Delete Modal
export const showAppDeleteModalAtom = atom(false);
export const appToDeleteAtom = atom(null);

// Widget Modal
export const showWidgetModalAtom = atom(false);
export const showAddWidgetFormAtom = atom(false);

// Widget Delete Modal
export const showWidgetDeleteModalAtom = atom(false);
export const widgetToDeleteAtom = atom(null);

// Result Modal
export const showResultModalAtom = atom(false);

// ===== Validation =====
const isValidVersion = R.both(
  R.complement(R.isNil),
  R.pipe(R.prop("version"), R.complement(R.isNil)),
);

// ===== Action Atoms =====

// Uninstall Modal (close only - open is async and handled by hook)
export const closeUninstallModalAtom = atom(null, (get, set) =>
  R.pipe(
    R.tap(() => set(showUninstallModalAtom, false)),
    R.tap(() => set(versionToUninstallAtom, null)),
    R.tap(() => set(relatedAppsAtom, [])),
  )(null),
);

// Download Modal
export const openDownloadModalAtom = atom(null, (get, set, version) =>
  R.ifElse(
    isValidVersion,
    R.pipe(
      R.tap((v) => set(versionToDownloadAtom, v)),
      R.tap(() => set(showDownloadModalAtom, true)),
    ),
    () => alert("Invalid version data"),
  )(version),
);

export const closeDownloadModalAtom = atom(null, (get, set) =>
  R.pipe(
    R.tap(() => set(showDownloadModalAtom, false)),
    R.tap(() => set(versionToDownloadAtom, null)),
  )(null),
);

// App Delete Modal
export const openAppDeleteModalAtom = atom(null, (get, set, app) =>
  R.pipe(
    R.tap((a) => set(appToDeleteAtom, a)),
    R.tap(() => set(showAppDeleteModalAtom, true)),
  )(app),
);

export const closeAppDeleteModalAtom = atom(null, (get, set) =>
  R.pipe(
    R.tap(() => set(showAppDeleteModalAtom, false)),
    R.tap(() => set(appToDeleteAtom, null)),
  )(null),
);

// Widget Delete Modal
export const openWidgetDeleteModalAtom = atom(null, (get, set, widget) =>
  R.pipe(
    R.tap((w) => set(widgetToDeleteAtom, w)),
    R.tap(() => set(showWidgetDeleteModalAtom, true)),
  )(widget),
);

export const closeWidgetDeleteModalAtom = atom(null, (get, set) =>
  R.pipe(
    R.tap(() => set(showWidgetDeleteModalAtom, false)),
    R.tap(() => set(widgetToDeleteAtom, null)),
  )(null),
);

// ===== Custom Hook for Async Uninstall Modal =====
export function useUninstallModalActions() {
  const [, setShowModal] = useAtom(showUninstallModalAtom);
  const [, setVersionToUninstall] = useAtom(versionToUninstallAtom);
  const [, setRelatedApps] = useAtom(relatedAppsAtom);
  const closeModal = useSetAtom(closeUninstallModalAtom);

  const openUninstallModal = useCallback(
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
    [setShowModal, setVersionToUninstall, setRelatedApps],
  );

  return {
    openUninstallModal,
    closeUninstallModal: closeModal,
    setRelatedApps,
  };
}
