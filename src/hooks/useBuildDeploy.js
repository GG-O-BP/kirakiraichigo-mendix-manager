import {
  useBuildDeployState,
  useInstallOperation,
  useBuildDeployOperation,
} from "./build-deploy";

export function useBuildDeploy({ onShowResultModal, packageManagerPersistence } = {}) {
  const state = useBuildDeployState();

  const install = useInstallOperation({
    packageManager: packageManagerPersistence.packageManager,
    setIsInstalling: state.setIsInstalling,
  });

  const buildDeploy = useBuildDeployOperation({
    packageManager: packageManagerPersistence.packageManager,
    setIsBuilding: state.setIsBuilding,
    setIsDeploying: state.setIsDeploying,
    setBuildResults: state.setBuildResults,
    setInlineResults: state.setInlineResults,
    setLastOperationType: state.setLastOperationType,
    onShowResultModal,
  });

  return {
    packageManager: packageManagerPersistence.packageManager,
    setPackageManager: packageManagerPersistence.setPackageManager,
    isInstalling: state.isInstalling,
    isBuilding: state.isBuilding,
    isDeploying: state.isDeploying,
    buildResults: state.buildResults,
    setBuildResults: state.setBuildResults,
    inlineResults: state.inlineResults,
    setInlineResults: state.setInlineResults,
    isUninstalling: state.isUninstalling,
    setIsUninstalling: state.setIsUninstalling,
    lastOperationType: state.lastOperationType,
    handleInstall: install.handleInstall,
    handleBuildDeploy: buildDeploy.handleBuildDeploy,
    handleDeployOnly: buildDeploy.handleDeployOnly,
  };
}
