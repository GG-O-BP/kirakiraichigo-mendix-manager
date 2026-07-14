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

  const prepareOperation = (operationType) =>
    R.pipe(
      R.tap(() => R.when(R.isNotNil, (show) => show(false))(onShowResultModal)),
      R.tap(() => setBuildResults({ successful: [], failed: [] })),
      R.tap(() => setLastOperationType(operationType)),
    )({});

  const applyResponse = R.ifElse(
    R.prop("validation_error"),
    R.pipe(R.prop("validation_error"), alert),
    R.pipe(
      R.tap(R.pipe(R.prop("results"), setBuildResults)),
      R.tap(R.pipe(R.prop("results"), setInlineResults)),
      R.tap(
        R.when(
          (response) => R.and(R.prop("has_failures", response), R.isNotNil(onShowResultModal)),
          () => onShowResultModal(true),
        ),
      ),
    ),
  );

  const applyCatastrophicError = (error) =>
    R.pipe(
      () => invokeCreateCatastrophicErrorResult(error),
      R.andThen(
        R.pipe(
          R.tap(setBuildResults),
          R.tap(setInlineResults),
          R.tap(() => R.when(R.isNotNil, (show) => show(true))(onShowResultModal)),
        ),
      ),
    )();

  const handleBuildDeploy = ({ selectedWidgets, selectedApps, widgets, apps }) => {
    prepareOperation("build");
    setIsBuilding(true);
    return R.pipe(
      () =>
        executeBuildDeploy({
          selectedWidgets,
          selectedApps,
          widgets,
          apps,
          packageManager,
        }),
      R.andThen(applyResponse),
      R.otherwise(applyCatastrophicError),
      R.andThen(() => setIsBuilding(false)),
      R.otherwise((error) => {
        setIsBuilding(false);
        throw error;
      }),
    )();
  };

  const handleDeployOnly = ({ selectedWidgets, selectedApps, widgets, apps }) => {
    prepareOperation("deploy");
    setIsDeploying(true);
    return R.pipe(
      () =>
        executeDeployOnly({
          selectedWidgets,
          selectedApps,
          widgets,
          apps,
        }),
      R.andThen(applyResponse),
      R.otherwise(applyCatastrophicError),
      R.andThen(() => setIsDeploying(false)),
      R.otherwise((error) => {
        setIsDeploying(false);
        throw error;
      }),
    )();
  };

  return {
    handleBuildDeploy,
    handleDeployOnly,
    isBuilding,
    isDeploying,
  };
}
