import * as R from "ramda";
import useSWRMutation from "swr/mutation";
import { invoke } from "@tauri-apps/api/core";
import { SWR_KEYS } from "../../lib/swr";

const LAUNCH_LOADING_RESET_DELAY_MS = 60000;

const launchStudioPro = (_, { arg }) => {
  const { version, updateLoadingState, isVersionBusy } = arg;

  return R.ifElse(
    isVersionBusy,
    R.always(null),
    (versionId) => {
      updateLoadingState(versionId, "launch", true);
      return R.pipe(
        () => invoke("launch_studio_pro", { version: versionId }),
        R.andThen(
          R.pipe(
            R.tap(() =>
              setTimeout(
                () => updateLoadingState(versionId, "launch", false),
                LAUNCH_LOADING_RESET_DELAY_MS,
              ),
            ),
            R.always({ success: true }),
          ),
        ),
        R.otherwise((error) => {
          updateLoadingState(versionId, "launch", false);
          throw error;
        }),
      )();
    },
  )(R.prop("version", version));
};

export function useLaunchOperation({ updateLoadingState, isVersionBusy }) {
  const { trigger, isMutating, error } = useSWRMutation(
    SWR_KEYS.LAUNCH_STUDIO_PRO,
    launchStudioPro,
  );

  const handleLaunchStudioPro = (version) =>
    R.pipe(
      () => trigger({ version, updateLoadingState, isVersionBusy }),
      R.otherwise((err) => alert(`Failed to launch Studio Pro: ${err}`)),
    )();

  return {
    handleLaunchStudioPro,
    isLaunching: isMutating,
    launchError: error,
  };
}
