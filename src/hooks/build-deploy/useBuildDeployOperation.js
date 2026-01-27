import * as R from "ramda";
import useSWRMutation from "swr/mutation";
import { invoke } from "@tauri-apps/api/core";
import { invokeCreateCatastrophicErrorResult } from "../../utils";

const buildDeploy = async (_, { arg }) => {
  const { selectedWidgets, selectedApps, widgets, apps, packageManager } = arg;
  const selectedWidgetIds = Array.from(selectedWidgets);
  const selectedAppPaths = Array.from(selectedApps);

  const response = await invoke("validate_and_build_deploy", {
    widgets,
    apps,
    packageManager,
    selectedWidgetIds,
    selectedAppPaths,
  });

  return response;
};

const deployOnly = async (_, { arg }) => {
  const { selectedWidgets, selectedApps, widgets, apps } = arg;
  const selectedWidgetIds = Array.from(selectedWidgets);
  const selectedAppPaths = Array.from(selectedApps);

  const response = await invoke("validate_and_deploy_only", {
    widgets,
    apps,
    selectedWidgetIds,
    selectedAppPaths,
  });

  return response;
};

export function useBuildDeployOperation({
  packageManager,
  setBuildResults,
  setInlineResults,
  setLastOperationType,
  onShowResultModal,
}) {
  const {
    trigger: triggerBuild,
    isMutating: isBuilding,
    error: buildError,
  } = useSWRMutation("build-deploy", buildDeploy);

  const {
    trigger: triggerDeploy,
    isMutating: isDeploying,
    error: deployError,
  } = useSWRMutation("deploy-only", deployOnly);

  const handleBuildDeploy = async ({ selectedWidgets, selectedApps, widgets, apps }) => {
    R.pipe(
      R.tap(() => onShowResultModal && onShowResultModal(false)),
      R.tap(() => setBuildResults({ successful: [], failed: [] })),
      R.tap(() => setLastOperationType("build")),
    )({});

    let response;
    try {
      response = await triggerBuild({
        selectedWidgets,
        selectedApps,
        widgets,
        apps,
        packageManager,
      });
    } catch (error) {
      const errorResult = await invokeCreateCatastrophicErrorResult(error);
      setBuildResults(errorResult);
      setInlineResults(errorResult);
      R.when(R.identity, () => onShowResultModal(true))(onShowResultModal);
      return;
    }

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
  };

  const handleDeployOnly = async ({ selectedWidgets, selectedApps, widgets, apps }) => {
    R.pipe(
      R.tap(() => onShowResultModal && onShowResultModal(false)),
      R.tap(() => setBuildResults({ successful: [], failed: [] })),
      R.tap(() => setLastOperationType("deploy")),
    )({});

    let response;
    try {
      response = await triggerDeploy({
        selectedWidgets,
        selectedApps,
        widgets,
        apps,
      });
    } catch (error) {
      const errorResult = await invokeCreateCatastrophicErrorResult(error);
      setBuildResults(errorResult);
      setInlineResults(errorResult);
      R.when(R.identity, () => onShowResultModal(true))(onShowResultModal);
      return;
    }

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
  };

  return {
    handleBuildDeploy,
    handleDeployOnly,
    isBuilding,
    isDeploying,
    buildError,
    deployError,
  };
}
