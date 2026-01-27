import * as R from "ramda";
import useSWRMutation from "swr/mutation";
import { invoke } from "@tauri-apps/api/core";
import { useSWRConfig } from "swr";
import { SWR_KEYS } from "../../lib/swr";

const uninstallStudioPro = async (_, { arg }) => {
  const { version, deleteApps, relatedAppsList, callbacks, updateLoadingState } = arg;
  const onDeleteApp = R.prop("onDeleteApp", callbacks);
  const versionId = R.prop("version", version);

  updateLoadingState(versionId, "uninstall", true);

  try {
    const shouldDeleteApps = R.all(R.identity, [
      deleteApps,
      R.complement(R.isEmpty)(relatedAppsList),
      R.complement(R.isNil)(onDeleteApp),
    ]);

    if (shouldDeleteApps) {
      for (const app of relatedAppsList) {
        await onDeleteApp(R.prop("path", app));
      }
    }

    const result = await invoke("uninstall_studio_pro_and_wait", {
      version: versionId,
      timeoutSeconds: 60,
    });

    R.when(
      R.prop("timed_out"),
      () => console.warn(`Uninstall of Studio Pro ${versionId} timed out, but may still complete`),
    )(result);

    return result;
  } finally {
    updateLoadingState(versionId, "uninstall", false);
  }
};

export function useUninstallOperation({ updateLoadingState }) {
  const { mutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "uninstall-studio-pro",
    uninstallStudioPro,
  );

  const handleUninstallStudioPro = async (version, deleteApps = false, relatedAppsList = [], callbacks = {}) => {
    const onComplete = R.prop("onComplete", callbacks);
    const versionId = R.prop("version", version);

    try {
      await trigger({ version, deleteApps, relatedAppsList, callbacks, updateLoadingState });
      await mutate(SWR_KEYS.INSTALLED_VERSIONS);
      R.when(R.complement(R.isNil), R.call)(onComplete);
    } catch (err) {
      const errorMsg = R.ifElse(
        R.always(deleteApps),
        R.always(`Failed to uninstall Studio Pro ${versionId} with apps: ${err}`),
        R.always(`Failed to uninstall Studio Pro ${versionId}: ${err}`),
      )();
      alert(errorMsg);
      R.when(R.complement(R.isNil), R.call)(onComplete);
    }
  };

  return {
    handleUninstallStudioPro,
    isUninstalling: isMutating,
    uninstallError: error,
  };
}
