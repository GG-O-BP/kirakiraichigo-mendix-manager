import * as R from "ramda";
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useUninstallOperation({ updateLoadingState, onLoadVersions }) {
  const handleUninstallStudioPro = useCallback(
    async (version, deleteApps = false, relatedAppsList = [], callbacks = {}) => {
      const onDeleteApp = R.prop("onDeleteApp", callbacks);
      const onComplete = R.prop("onComplete", callbacks);
      const versionId = R.prop("version", version);

      updateLoadingState(versionId, "uninstall", true);

      const cleanupUninstallState = () => {
        updateLoadingState(versionId, "uninstall", false);
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
    [updateLoadingState, onLoadVersions],
  );

  return {
    handleUninstallStudioPro,
  };
}
