import { useVersionLoadingStates } from "./useVersionLoadingStates";
import { useLaunchOperation } from "./useLaunchOperation";
import { useUninstallOperation } from "./useUninstallOperation";
import { useDownloadOperation } from "./useDownloadOperation";

export function useVersionOperations() {
  const loadingStates = useVersionLoadingStates();
  const { updateLoadingState, isVersionBusy, getLoadingStateSync } = loadingStates;

  const launch = useLaunchOperation({ updateLoadingState, isVersionBusy });
  const uninstall = useUninstallOperation({ updateLoadingState });
  const download = useDownloadOperation({ updateLoadingState });

  return {
    getLoadingStateSync,
    ...launch,
    ...uninstall,
    ...download,
  };
}
