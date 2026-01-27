import * as R from "ramda";
import useSWRMutation from "swr/mutation";
import { invoke } from "@tauri-apps/api/core";

const LAUNCH_LOADING_RESET_DELAY_MS = 60000;

const launchStudioPro = async (_, { arg }) => {
  const { version, updateLoadingState, isVersionBusy } = arg;
  const versionId = R.prop("version", version);

  if (isVersionBusy(versionId)) {
    return null;
  }

  updateLoadingState(versionId, "launch", true);

  try {
    await invoke("launch_studio_pro", {
      version: version.version,
    });
    setTimeout(() => {
      updateLoadingState(versionId, "launch", false);
    }, LAUNCH_LOADING_RESET_DELAY_MS);
    return { success: true };
  } catch (error) {
    updateLoadingState(versionId, "launch", false);
    throw error;
  }
};

export function useLaunchOperation({ updateLoadingState, isVersionBusy }) {
  const { trigger, isMutating, error } = useSWRMutation(
    "launch-studio-pro",
    launchStudioPro,
  );

  const handleLaunchStudioPro = async (version) => {
    try {
      await trigger({ version, updateLoadingState, isVersionBusy });
    } catch (err) {
      alert(`Failed to launch Studio Pro: ${err}`);
    }
  };

  return {
    handleLaunchStudioPro,
    isLaunching: isMutating,
    launchError: error,
  };
}
