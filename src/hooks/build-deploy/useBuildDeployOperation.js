import * as R from "ramda";
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  invokeValidateBuildDeploySelections,
  createCatastrophicErrorResult,
  invokeHasBuildFailures,
} from "../../utils";
import { filterWidgetsBySelectedIds, filterAppsBySelectedPaths } from "../../utils/dataProcessing";

/**
 * Build and deploy operation hook
 * Handles building widgets and deploying to selected apps
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
      const validationError = await invokeValidateBuildDeploySelections(
        selectedWidgets,
        selectedApps,
      );

      if (validationError) {
        alert(validationError);
        return;
      }

      const initializeBuildState = R.pipe(
        R.tap(() => onShowResultModal && onShowResultModal(false)),
        R.tap(() => setBuildResults({ successful: [], failed: [] })),
        R.tap(() => setIsBuilding(true)),
        R.always(null),
      );

      initializeBuildState();

      const selectedWidgetIds = Array.from(selectedWidgets);
      const selectedAppPaths = Array.from(selectedApps);

      const widgetsList = await filterWidgetsBySelectedIds(widgets, selectedWidgetIds);
      const appsList = await filterAppsBySelectedPaths(apps, selectedAppPaths);

      const executeBuildDeploy = R.tryCatch(
        async () =>
          await invoke("build_and_deploy_from_selections", {
            widgets: widgetsList,
            apps: appsList,
            packageManager,
          }),
        createCatastrophicErrorResult,
      );

      const results = await executeBuildDeploy();
      setBuildResults(results);
      setInlineResults(results);
      setIsBuilding(false);

      const hasFailures = await invokeHasBuildFailures(results);
      if (hasFailures && onShowResultModal) {
        onShowResultModal(true);
      }
    },
    [packageManager, setIsBuilding, setBuildResults, setInlineResults, onShowResultModal],
  );

  return { handleBuildDeploy };
}
