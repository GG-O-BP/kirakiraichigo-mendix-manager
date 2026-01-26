import { useVersionLoadingStates } from "./useVersionLoadingStates";
import { useLaunchOperation } from "./useLaunchOperation";
import { useUninstallOperation } from "./useUninstallOperation";
import { useDownloadOperation } from "./useDownloadOperation";

export function useVersionOperations({ onLoadVersions }) {
  const loadingStates = useVersionLoadingStates();
  const { updateLoadingState, isVersionBusy } = loadingStates;

  const launch = useLaunchOperation({ updateLoadingState, isVersionBusy });
  const uninstall = useUninstallOperation({ updateLoadingState, onLoadVersions });
  const download = useDownloadOperation({ updateLoadingState, onLoadVersions });

  return {
    versionLoadingStates: loadingStates.versionLoadingStates,
    setVersionLoadingStates: loadingStates.setVersionLoadingStates,
    ...launch,
    ...uninstall,
    ...download,
  };
}
