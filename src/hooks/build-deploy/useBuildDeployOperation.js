import * as R from "ramda";
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  invokeValidateBuildDeploySelections,
  invokeCreateCatastrophicErrorResult,
  invokeHasBuildFailures,
} from "../../utils";
import { filterWidgetsBySelectedIds } from "../../utils/data-processing/widgetFiltering";
import { filterAppsBySelectedPaths } from "../../utils/data-processing/appFiltering";

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

      let results;
      try {
        results = await invoke("build_and_deploy_from_selections", {
          widgets: widgetsList,
          apps: appsList,
          packageManager,
        });
      } catch (error) {
        results = await invokeCreateCatastrophicErrorResult(error);
      }
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
