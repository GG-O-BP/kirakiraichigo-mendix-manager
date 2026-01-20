import {
  useBuildDeployState,
  usePackageManagerPersistence,
  useInstallOperation,
  useBuildDeployOperation,
} from "./build-deploy";

export function useBuildDeploy({ onShowResultModal } = {}) {
  const state = useBuildDeployState();
  const persistence = usePackageManagerPersistence();

  const install = useInstallOperation({
    packageManager: persistence.packageManager,
    setIsInstalling: state.setIsInstalling,
  });

  const buildDeploy = useBuildDeployOperation({
    packageManager: persistence.packageManager,
    setIsBuilding: state.setIsBuilding,
    setBuildResults: state.setBuildResults,
    setInlineResults: state.setInlineResults,
    onShowResultModal,
  });

  return {
    packageManager: persistence.packageManager,
    setPackageManager: persistence.setPackageManager,
    isInstalling: state.isInstalling,
    isBuilding: state.isBuilding,
    buildResults: state.buildResults,
    setBuildResults: state.setBuildResults,
    inlineResults: state.inlineResults,
    setInlineResults: state.setInlineResults,
    isUninstalling: state.isUninstalling,
    setIsUninstalling: state.setIsUninstalling,
    handleInstall: install.handleInstall,
    handleBuildDeploy: buildDeploy.handleBuildDeploy,
  };
}

export default useBuildDeploy;
