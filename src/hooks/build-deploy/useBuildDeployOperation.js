import * as R from "ramda";
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { invokeCreateCatastrophicErrorResult } from "../../utils";

export function useBuildDeployOperation({
  packageManager,
  setIsBuilding,
  setIsDeploying,
  setBuildResults,
  setInlineResults,
  setLastOperationType,
  onShowResultModal,
}) {
  const handleBuildDeploy = useCallback(
    async ({ selectedWidgets, selectedApps, widgets, apps }) => {
      const selectedWidgetIds = Array.from(selectedWidgets);
      const selectedAppPaths = Array.from(selectedApps);

      R.pipe(
        R.tap(() => onShowResultModal && onShowResultModal(false)),
        R.tap(() => setBuildResults({ successful: [], failed: [] })),
        R.tap(() => setLastOperationType("build")),
        R.tap(() => setIsBuilding(true)),
      )({});

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

      if (response.validation_error) {
        setIsBuilding(false);
        alert(response.validation_error);
        return;
      }

      const results = response.results;
      setBuildResults(results);
      setInlineResults(results);
      setIsBuilding(false);

      R.when(
        R.always(response.has_failures && onShowResultModal),
        () => onShowResultModal(true)
      )({});
    },
    [packageManager, setIsBuilding, setBuildResults, setInlineResults, setLastOperationType, onShowResultModal],
  );

  const handleDeployOnly = useCallback(
    async ({ selectedWidgets, selectedApps, widgets, apps }) => {
      const selectedWidgetIds = Array.from(selectedWidgets);
      const selectedAppPaths = Array.from(selectedApps);

      R.pipe(
        R.tap(() => onShowResultModal && onShowResultModal(false)),
        R.tap(() => setBuildResults({ successful: [], failed: [] })),
        R.tap(() => setLastOperationType("deploy")),
        R.tap(() => setIsDeploying(true)),
      )({});

      let response;
      try {
        response = await invoke("validate_and_deploy_only", {
          widgets,
          apps,
          selectedWidgetIds,
          selectedAppPaths,
        });
      } catch (error) {
        const errorResult = await invokeCreateCatastrophicErrorResult(error);
        setBuildResults(errorResult);
        setInlineResults(errorResult);
        setIsDeploying(false);
        R.when(R.identity, () => onShowResultModal(true))(onShowResultModal);
        return;
      }

      if (response.validation_error) {
        setIsDeploying(false);
        alert(response.validation_error);
        return;
      }

      const results = response.results;
      setBuildResults(results);
      setInlineResults(results);
      setIsDeploying(false);

      R.when(
        R.always(response.has_failures && onShowResultModal),
        () => onShowResultModal(true)
      )({});
    },
    [setIsDeploying, setBuildResults, setInlineResults, setLastOperationType, onShowResultModal],
  );

  return { handleBuildDeploy, handleDeployOnly };
}
