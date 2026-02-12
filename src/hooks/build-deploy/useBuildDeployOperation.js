import * as R from "ramda";
import { useAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { invokeCreateCatastrophicErrorResult } from "../../utils";
import { isBuildingAtom, isDeployingAtom } from "../../atoms";

const executeBuildDeploy = async ({ selectedWidgets, selectedApps, widgets, apps, packageManager }) => {
  const selectedWidgetIds = Array.from(selectedWidgets);
  const selectedAppPaths = Array.from(selectedApps);

  return invoke("validate_and_build_deploy", {
    widgets,
    apps,
    packageManager,
    selectedWidgetIds,
    selectedAppPaths,
  });
};

const executeDeployOnly = async ({ selectedWidgets, selectedApps, widgets, apps }) => {
  const selectedWidgetIds = Array.from(selectedWidgets);
  const selectedAppPaths = Array.from(selectedApps);

  return invoke("validate_and_deploy_only", {
    widgets,
    apps,
    selectedWidgetIds,
    selectedAppPaths,
  });
};

export function useBuildDeployOperation({
  packageManager,
  setBuildResults,
  setInlineResults,
  setLastOperationType,
  onShowResultModal,
}) {
  const [isBuilding, setIsBuilding] = useAtom(isBuildingAtom);
  const [isDeploying, setIsDeploying] = useAtom(isDeployingAtom);

  const handleBuildDeploy = async ({ selectedWidgets, selectedApps, widgets, apps }) => {
    R.pipe(
      R.tap(() => onShowResultModal && onShowResultModal(false)),
      R.tap(() => setBuildResults({ successful: [], failed: [] })),
      R.tap(() => setLastOperationType("build")),
    )({});

    setIsBuilding(true);
    try {
      const response = await executeBuildDeploy({
        selectedWidgets,
        selectedApps,
        widgets,
        apps,
        packageManager,
      });

      if (response.validation_error) {
        alert(response.validation_error);
        return;
      }

      const results = response.results;
      setBuildResults(results);
      setInlineResults(results);

      R.when(
        R.always(response.has_failures && onShowResultModal),
        () => onShowResultModal(true),
      )({});
    } catch (error) {
      const errorResult = await invokeCreateCatastrophicErrorResult(error);
      setBuildResults(errorResult);
      setInlineResults(errorResult);
      R.when(R.identity, () => onShowResultModal(true))(onShowResultModal);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleDeployOnly = async ({ selectedWidgets, selectedApps, widgets, apps }) => {
    R.pipe(
      R.tap(() => onShowResultModal && onShowResultModal(false)),
      R.tap(() => setBuildResults({ successful: [], failed: [] })),
      R.tap(() => setLastOperationType("deploy")),
    )({});

    setIsDeploying(true);
    try {
      const response = await executeDeployOnly({
        selectedWidgets,
        selectedApps,
        widgets,
        apps,
      });

      if (response.validation_error) {
        alert(response.validation_error);
        return;
      }

      const results = response.results;
      setBuildResults(results);
      setInlineResults(results);

      R.when(
        R.always(response.has_failures && onShowResultModal),
        () => onShowResultModal(true),
      )({});
    } catch (error) {
      const errorResult = await invokeCreateCatastrophicErrorResult(error);
      setBuildResults(errorResult);
      setInlineResults(errorResult);
      R.when(R.identity, () => onShowResultModal(true))(onShowResultModal);
    } finally {
      setIsDeploying(false);
    }
  };

  return {
    handleBuildDeploy,
    handleDeployOnly,
    isBuilding,
    isDeploying,
  };
}
