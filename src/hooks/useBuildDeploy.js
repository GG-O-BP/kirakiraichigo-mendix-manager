import { useCallback } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import {
  useBuildDeployState,
  useInstallOperation,
  useBuildDeployOperation,
  usePackageManagerPersistence,
} from "./build-deploy";
import { showResultModalAtom } from "../atoms";
import { itemsAtomFamily, selectedItemsAtomFamily } from "../atoms/collection";

export function useBuildDeploy() {
  const state = useBuildDeployState();
  const { packageManager, setPackageManager } = usePackageManagerPersistence();
  const setShowResultModal = useSetAtom(showResultModalAtom);

  const install = useInstallOperation({ packageManager });

  const buildDeploy = useBuildDeployOperation({
    packageManager,
    setBuildResults: state.setBuildResults,
    setInlineResults: state.setInlineResults,
    setLastOperationType: state.setLastOperationType,
    onShowResultModal: setShowResultModal,
  });

  const widgets = useAtomValue(itemsAtomFamily("widgets"));
  const apps = useAtomValue(itemsAtomFamily("apps"));
  const selectedWidgets = useAtomValue(selectedItemsAtomFamily("widgets"));
  const selectedApps = useAtomValue(selectedItemsAtomFamily("apps"));

  const handleInstall = useCallback(
    () =>
      install.handleInstall({
        selectedWidgets,
        widgets,
      }),
    [install.handleInstall, selectedWidgets, widgets],
  );

  const handleBuildDeploy = useCallback(
    () =>
      buildDeploy.handleBuildDeploy({
        selectedWidgets,
        selectedApps,
        widgets,
        apps,
      }),
    [buildDeploy.handleBuildDeploy, selectedWidgets, selectedApps, widgets, apps],
  );

  const handleDeployOnly = useCallback(
    () =>
      buildDeploy.handleDeployOnly({
        selectedWidgets,
        selectedApps,
        widgets,
        apps,
      }),
    [buildDeploy.handleDeployOnly, selectedWidgets, selectedApps, widgets, apps],
  );

  return {
    packageManager,
    setPackageManager,
    isInstalling: install.isInstalling,
    isBuilding: buildDeploy.isBuilding,
    isDeploying: buildDeploy.isDeploying,
    buildResults: state.buildResults,
    setBuildResults: state.setBuildResults,
    inlineResults: state.inlineResults,
    setInlineResults: state.setInlineResults,
    isUninstalling: state.isUninstalling,
    setIsUninstalling: state.setIsUninstalling,
    lastOperationType: state.lastOperationType,
    handleInstall,
    handleBuildDeploy,
    handleDeployOnly,
  };
}
