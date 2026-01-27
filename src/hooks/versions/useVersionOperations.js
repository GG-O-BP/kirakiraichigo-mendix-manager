import { useVersionLoadingStates } from "./useVersionLoadingStates";
import { useLaunchOperation } from "./useLaunchOperation";
import { useUninstallOperation } from "./useUninstallOperation";
import { useDownloadOperation } from "./useDownloadOperation";

export function useVersionOperations({ onLoadVersions }) {
  const loadingStates = useVersionLoadingStates();
  const { updateLoadingState, isVersionBusy, getLoadingStateSync } = loadingStates;

  const launch = useLaunchOperation({ updateLoadingState, isVersionBusy });
  const uninstall = useUninstallOperation({ updateLoadingState, onLoadVersions });
  const download = useDownloadOperation({ updateLoadingState, onLoadVersions });

  return {
    getLoadingStateSync,
    ...launch,
    ...uninstall,
    ...download,
  };
}
