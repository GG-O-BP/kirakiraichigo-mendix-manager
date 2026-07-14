import * as R from "ramda";
import useSWRMutation from "swr/mutation";
import { invoke } from "@tauri-apps/api/core";
import { useSWRConfig } from "swr";
import { SWR_KEYS } from "../../lib/swr";

const downloadVersion = (_, { arg }) => {
  const { versionId, updateLoadingState } = arg;
  updateLoadingState(versionId, "download", true);
  return R.pipe(
    () => invoke("download_and_install_mendix_version", { version: versionId }),
    R.andThen(R.tap(() => updateLoadingState(versionId, "download", false))),
    R.otherwise((error) => {
      updateLoadingState(versionId, "download", false);
      throw error;
    }),
  )();
};

export function useDownloadOperation({ updateLoadingState }) {
  const { mutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    SWR_KEYS.DOWNLOAD_VERSION,
    downloadVersion,
  );

  const handleModalDownload = (version) =>
    R.pipe(
      () => trigger({ versionId: R.prop("version", version), updateLoadingState }),
      R.andThen((result) =>
        R.pipe(
          () => mutate(SWR_KEYS.INSTALLED_VERSIONS),
          R.andThen(R.always(result)),
        )(),
      ),
      R.otherwise((err) => {
        console.error("Error in download process:", err);
        throw err;
      }),
    )();

  return {
    handleModalDownload,
    isDownloading: isMutating,
    downloadError: error,
  };
}
