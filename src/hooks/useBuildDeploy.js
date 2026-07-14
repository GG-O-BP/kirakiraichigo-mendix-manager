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
  const {
    buildResults,
    setBuildResults,
    inlineResults,
    setInlineResults,
    isUninstalling,
    setIsUninstalling,
    lastOperationType,
    setLastOperationType,
  } = useBuildDeployState();
  const { packageManager, setPackageManager } = usePackageManagerPersistence();
  const setShowResultModal = useSetAtom(showResultModalAtom);

  const { handleInstall: runInstall, isInstalling } = useInstallOperation({
    packageManager,
  });

  const {
    handleBuildDeploy: runBuildDeploy,
    handleDeployOnly: runDeployOnly,
    isBuilding,
    isDeploying,
  } = useBuildDeployOperation({
    packageManager,
    setBuildResults,
    setInlineResults,
    setLastOperationType,
    onShowResultModal: setShowResultModal,
  });

  const widgets = useAtomValue(itemsAtomFamily("widgets"));
  const apps = useAtomValue(itemsAtomFamily("apps"));
  const selectedWidgets = useAtomValue(selectedItemsAtomFamily("widgets"));
  const selectedApps = useAtomValue(selectedItemsAtomFamily("apps"));

  const handleInstall = useCallback(
    () => runInstall({ selectedWidgets, widgets }),
    [runInstall, selectedWidgets, widgets],
  );

  const handleBuildDeploy = useCallback(
    () => runBuildDeploy({ selectedWidgets, selectedApps, widgets, apps }),
    [runBuildDeploy, selectedWidgets, selectedApps, widgets, apps],
  );

  const handleDeployOnly = useCallback(
    () => runDeployOnly({ selectedWidgets, selectedApps, widgets, apps }),
    [runDeployOnly, selectedWidgets, selectedApps, widgets, apps],
  );

  return {
    packageManager,
    setPackageManager,
    isInstalling,
    isBuilding,
    isDeploying,
    buildResults,
    setBuildResults,
    inlineResults,
    setInlineResults,
    isUninstalling,
    setIsUninstalling,
    lastOperationType,
    handleInstall,
    handleBuildDeploy,
    handleDeployOnly,
  };
}
