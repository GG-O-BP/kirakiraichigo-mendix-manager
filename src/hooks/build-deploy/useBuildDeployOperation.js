import * as R from "ramda";
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { invokeCreateCatastrophicErrorResult } from "../../utils";

/**
 * Build and deploy operation hook using consolidated validate_and_build_deploy command.
 * This replaces 3 separate IPC calls with a single call for better performance.
 *
 * @param {Object} params - Hook parameters
 * @param {string} params.packageManager - Current package manager
 * @param {function} params.setIsBuilding - Loading state setter
 * @param {function} params.setBuildResults - Results state setter
 * @param {function} params.setInlineResults - Inline results state setter
 * @param {function} params.onShowResultModal - Optional callback when result modal should be shown
 */
export function useBuildDeployOperation({
  packageManager,
  setIsBuilding,
  setBuildResults,
  setInlineResults,
  onShowResultModal,
}) {
  const handleBuildDeploy = useCallback(
    async ({ selectedWidgets, selectedApps, widgets, apps }) => {
      const selectedWidgetIds = Array.from(selectedWidgets);
      const selectedAppPaths = Array.from(selectedApps);

      // Initialize build state BEFORE invoke call
      R.pipe(
        R.tap(() => onShowResultModal && onShowResultModal(false)),
        R.tap(() => setBuildResults({ successful: [], failed: [] })),
        R.tap(() => setIsBuilding(true)),
      )({});

      // Use consolidated command: 3 IPC calls → 1 IPC call
      // This combines: validate_build_deploy_selections + build_and_deploy_from_selections + has_build_failures
      let response;
      try {
        response = await invoke("validate_and_build_deploy", {
          widgets,
          apps,
          packageManager,
          selectedWidgetIds,
          selectedAppPaths,
        });
      } catch (error) {
        const errorResult = await invokeCreateCatastrophicErrorResult(error);
        setBuildResults(errorResult);
        setInlineResults(errorResult);
        setIsBuilding(false);
        R.when(R.identity, () => onShowResultModal(true))(onShowResultModal);
        return;
      }

      // Handle validation error
      if (response.validation_error) {
        setIsBuilding(false);
        alert(response.validation_error);
        return;
      }

      // Set results from consolidated response
      const results = response.results;
      setBuildResults(results);
      setInlineResults(results);
      setIsBuilding(false);

      // Show modal if there are failures
      R.when(
        R.always(response.has_failures && onShowResultModal),
        () => onShowResultModal(true)
      )({});
    },
    [packageManager, setIsBuilding, setBuildResults, setInlineResults, onShowResultModal],
  );

  return { handleBuildDeploy };
}
