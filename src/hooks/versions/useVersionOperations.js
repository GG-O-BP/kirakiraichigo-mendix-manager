import * as R from "ramda";
import { useVersionLoadingStates } from "./useVersionLoadingStates";
import { useLaunchOperation } from "./useLaunchOperation";
import { useUninstallOperation } from "./useUninstallOperation";
import { useDownloadOperation } from "./useDownloadOperation";

export function useVersionOperations() {
  const { updateLoadingState, isVersionBusy, getLoadingStateSync } = useVersionLoadingStates();

  const launch = useLaunchOperation({ updateLoadingState, isVersionBusy });
  const uninstall = useUninstallOperation({ updateLoadingState });
  const download = useDownloadOperation({ updateLoadingState });

  return R.mergeAll([{ getLoadingStateSync }, launch, uninstall, download]);
}
