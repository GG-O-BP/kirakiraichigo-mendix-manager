import * as R from "ramda";
import useSWRMutation from "swr/mutation";
import { invoke } from "@tauri-apps/api/core";
import { useSWRConfig } from "swr";
import { SWR_KEYS } from "../../lib/swr";

const downloadVersion = async (_, { arg }) => {
  const { versionId, updateLoadingState } = arg;
  try {
    updateLoadingState(versionId, "download", true);
    const result = await invoke("download_and_install_mendix_version", {
      version: versionId,
    });
    return result;
  } finally {
    updateLoadingState(versionId, "download", false);
  }
};

export function useDownloadOperation({ updateLoadingState }) {
  const { mutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "download-version",
    downloadVersion,
  );

  const handleModalDownload = async (version) => {
    const versionId = R.prop("version", version);
    try {
      const result = await trigger({ versionId, updateLoadingState });
      await mutate(SWR_KEYS.INSTALLED_VERSIONS);
      return result;
    } catch (err) {
      console.error("Error in download process:", err);
      throw err;
    }
  };

  return {
    handleModalDownload,
    isDownloading: isMutating,
    downloadError: error,
  };
}
