import * as R from "ramda";
import useSWRMutation from "swr/mutation";
import { invoke } from "@tauri-apps/api/core";
import { useSWRConfig } from "swr";
import { SWR_KEYS } from "../../lib/swr";

const deleteAppsSequentially = (relatedAppsList, onDeleteApp) =>
  R.reduce(
    (acc, app) => R.andThen(() => onDeleteApp(R.prop("path", app)), acc),
    Promise.resolve(),
    relatedAppsList,
  );

const uninstallStudioPro = (_, { arg }) => {
  const { version, deleteApps, relatedAppsList, callbacks, updateLoadingState } = arg;
  const onDeleteApp = R.prop("onDeleteApp", callbacks);
  const versionId = R.prop("version", version);

  updateLoadingState(versionId, "uninstall", true);

  const shouldDeleteApps = R.all(R.identity, [
    deleteApps,
    R.isNotEmpty(relatedAppsList),
    R.isNotNil(onDeleteApp),
  ]);

  return R.pipe(
    R.ifElse(
      R.identity,
      () => deleteAppsSequentially(relatedAppsList, onDeleteApp),
      () => Promise.resolve(),
    ),
    R.andThen(() =>
      invoke("uninstall_studio_pro_and_wait", {
        version: versionId,
        timeoutSeconds: 60,
      }),
    ),
    R.andThen(
      R.tap(
        R.when(
          R.prop("timed_out"),
          () => console.warn(`Uninstall of Studio Pro ${versionId} timed out, but may still complete`),
        ),
      ),
    ),
    R.andThen(R.tap(() => updateLoadingState(versionId, "uninstall", false))),
    R.otherwise((error) => {
      updateLoadingState(versionId, "uninstall", false);
      throw error;
    }),
  )(shouldDeleteApps);
};

export function useUninstallOperation({ updateLoadingState }) {
  const { mutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    SWR_KEYS.UNINSTALL_STUDIO_PRO,
    uninstallStudioPro,
  );

  const handleUninstallStudioPro = (version, deleteApps = false, relatedAppsList = [], callbacks = {}) => {
    const onComplete = R.prop("onComplete", callbacks);
    const versionId = R.prop("version", version);

    return R.pipe(
      () => trigger({ version, deleteApps, relatedAppsList, callbacks, updateLoadingState }),
      R.andThen(() => mutate(SWR_KEYS.INSTALLED_VERSIONS)),
      R.andThen(() => R.when(R.isNotNil, R.call)(onComplete)),
      R.otherwise(
        R.pipe(
          R.tap((err) =>
            alert(
              R.ifElse(
                R.always(deleteApps),
                R.always(`Failed to uninstall Studio Pro ${versionId} with apps: ${err}`),
                R.always(`Failed to uninstall Studio Pro ${versionId}: ${err}`),
              )(),
            ),
          ),
          R.tap(() => R.when(R.isNotNil, R.call)(onComplete)),
        ),
      ),
    )();
  };

  return {
    handleUninstallStudioPro,
    isUninstalling: isMutating,
    uninstallError: error,
  };
}
