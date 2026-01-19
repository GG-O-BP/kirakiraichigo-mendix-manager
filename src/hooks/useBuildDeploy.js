import {
  useBuildDeployState,
  usePackageManagerPersistence,
  useInstallOperation,
  useBuildDeployOperation,
} from "./build-deploy";

/**
 * Build and deploy composition hook.
 * Combines sub-hooks for state, persistence, and operations.
 * Maintains backward compatibility by flattening all returns.
 *
 * @param {Object} options - Optional configuration
 * @param {function} options.onShowResultModal - Callback when result modal should be shown
 */
export function useBuildDeploy(options = {}) {
  const { onShowResultModal } = options;

  // State management
  const state = useBuildDeployState();

  // Package manager persistence
  const persistence = usePackageManagerPersistence();

  // Install operation
  const install = useInstallOperation({
    packageManager: persistence.packageManager,
    setIsInstalling: state.setIsInstalling,
  });

  // Build & deploy operation
  const buildDeploy = useBuildDeployOperation({
    packageManager: persistence.packageManager,
    setIsBuilding: state.setIsBuilding,
    setBuildResults: state.setBuildResults,
    setInlineResults: state.setInlineResults,
    onShowResultModal,
  });

  return {
    // Package manager
    packageManager: persistence.packageManager,
    setPackageManager: persistence.setPackageManager,
    // State
    isInstalling: state.isInstalling,
    isBuilding: state.isBuilding,
    buildResults: state.buildResults,
    setBuildResults: state.setBuildResults,
    inlineResults: state.inlineResults,
    setInlineResults: state.setInlineResults,
    isUninstalling: state.isUninstalling,
    setIsUninstalling: state.setIsUninstalling,
    // Operations
    handleInstall: install.handleInstall,
    handleBuildDeploy: buildDeploy.handleBuildDeploy,
  };
}

export default useBuildDeploy;
