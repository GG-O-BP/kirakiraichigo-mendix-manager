import * as R from "ramda";
import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  updateVersionLoadingStates,
  getVersionLoadingState,
} from "../../utils";

const LAUNCH_LOADING_RESET_DELAY_MS = 60000;

/**
 * useVersionOperations - Handles version operations (launch, uninstall, download)
 * @param {Object} params - Parameters object
 * @param {Function} params.onLoadVersions - Callback to reload versions after operations
 */
export function useVersionOperations({ onLoadVersions }) {
  const [versionLoadingStates, setVersionLoadingStates] = useState({});

  const handleLaunchStudioPro = useCallback(
    async (version) => {
      const versionId = R.prop("version", version);
      const loadingState = getVersionLoadingState(
        versionLoadingStates,
        versionId,
      );

      const isLoading = R.either(
        R.prop("isLaunching"),
        R.prop("isUninstalling"),
      )(loadingState);

      if (isLoading) {
        return;
      }

      setVersionLoadingStates((prev) =>
        updateVersionLoadingStates(versionId, "launch", true, prev),
      );

      try {
        await invoke("launch_studio_pro", {
          version: version.version,
        });
        setTimeout(() => {
          setVersionLoadingStates((prev) =>
            updateVersionLoadingStates(versionId, "launch", false, prev),
          );
        }, LAUNCH_LOADING_RESET_DELAY_MS);
      } catch (error) {
        alert(`Failed to launch Studio Pro: ${error}`);
        setVersionLoadingStates((prev) =>
          updateVersionLoadingStates(versionId, "launch", false, prev),
        );
      }
    },
    [versionLoadingStates],
  );

  const handleUninstallStudioPro = useCallback(
    async (version, deleteApps = false, relatedAppsList = [], callbacks = {}) => {
      const onDeleteApp = R.prop("onDeleteApp", callbacks);
      const onComplete = R.prop("onComplete", callbacks);
      const versionId = R.prop("version", version);

      setVersionLoadingStates((prev) =>
        updateVersionLoadingStates(versionId, "uninstall", true, prev),
      );

      const cleanupUninstallState = () => {
        setVersionLoadingStates((prev) =>
          updateVersionLoadingStates(versionId, "uninstall", false, prev),
        );
      };

      try {
        const shouldDeleteApps = R.all(R.identity, [
          deleteApps,
          R.complement(R.isEmpty)(relatedAppsList),
          R.complement(R.isNil)(onDeleteApp),
        ]);

        if (shouldDeleteApps) {
          for (const app of relatedAppsList) {
            await onDeleteApp(R.prop("path", app));
          }
        }

        const result = await invoke("uninstall_studio_pro_and_wait", {
          version: versionId,
          timeoutSeconds: 60,
        });

        await onLoadVersions();

        R.when(
          R.prop("timed_out"),
          () => console.warn(`Uninstall of Studio Pro ${versionId} timed out, but may still complete`),
        )(result);

        cleanupUninstallState();
        R.when(R.complement(R.isNil), R.call)(onComplete);
      } catch (error) {
        const errorMsg = R.ifElse(
          R.always(deleteApps),
          R.always(`Failed to uninstall Studio Pro ${versionId} with apps: ${error}`),
          R.always(`Failed to uninstall Studio Pro ${versionId}: ${error}`),
        )();
        alert(errorMsg);
        cleanupUninstallState();
        R.when(R.complement(R.isNil), R.call)(onComplete);
      }
    },
    [onLoadVersions],
  );

  const handleModalDownload = useCallback(
    async (version) => {
      const versionId = R.prop("version", version);
      try {
        setVersionLoadingStates((prev) =>
          updateVersionLoadingStates(versionId, "download", true, prev),
        );

        const result = await invoke("download_and_install_mendix_version", {
          version: versionId,
        });

        await onLoadVersions();

        return result;
      } catch (error) {
        console.error("Error in download process:", error);
        throw error;
      } finally {
        setVersionLoadingStates((prev) =>
          updateVersionLoadingStates(versionId, "download", false, prev),
        );
      }
    },
    [onLoadVersions],
  );

  return {
    versionLoadingStates,
    setVersionLoadingStates,
    handleLaunchStudioPro,
    handleUninstallStudioPro,
    handleModalDownload,
  };
}
