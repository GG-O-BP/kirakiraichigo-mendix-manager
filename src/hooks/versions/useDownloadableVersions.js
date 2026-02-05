import * as R from "ramda";
import { useCallback } from "react";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";
import { SWR_KEYS } from "../../lib/swr";

const fetchCachedVersions = () => invoke("load_downloadable_versions_cache");

let hasLoadedInitialVersions = false;

export function useDownloadableVersions() {
  const {
    data: downloadableVersions = [],
    error,
    isLoading: isLoadingDownloadableVersions,
    mutate,
  } = useSWR(SWR_KEYS.DOWNLOADABLE_VERSIONS, fetchCachedVersions, {
    onSuccess: (cached) => {
      R.when(
        R.both(
          R.complement(R.isEmpty),
          () => !hasLoadedInitialVersions,
        ),
        async () => {
          hasLoadedInitialVersions = true;
          await fetchVersionsFromDatagrid(1);
        },
      )(cached);

      R.when(
        R.both(
          R.isEmpty,
          () => !hasLoadedInitialVersions,
        ),
        async () => {
          hasLoadedInitialVersions = true;
          await fetchVersionsFromDatagrid(1);
        },
      )(cached);
    },
  });

  const fetchVersionsFromDatagrid = useCallback(
    async (page = 1) => {
      try {
        const processedPage = R.pipe(R.defaultTo(1), R.max(1))(page);

        const versions = await invoke("get_downloadable_versions_from_datagrid", {
          page: processedPage,
        });

        const merged = await invoke("merge_and_save_downloadable_versions", {
          fresh: versions,
        });

        mutate(merged, false);
        return versions;
      } catch (err) {
        console.error("Failed to fetch versions from datagrid:", err);
        return [];
      }
    },
    [mutate],
  );

  const clearCache = useCallback(async () => {
    try {
      await invoke("clear_downloadable_versions_cache");
      mutate([], false);
      hasLoadedInitialVersions = false;
      return true;
    } catch (err) {
      console.error("Failed to clear cache:", err);
      return false;
    }
  }, [mutate]);

  const refreshVersions = useCallback(async () => {
    await clearCache();
    return fetchVersionsFromDatagrid(1);
  }, [clearCache, fetchVersionsFromDatagrid]);

  return {
    downloadableVersions,
    isLoadingDownloadableVersions,
    fetchVersionsFromDatagrid,
    clearCache,
    refreshVersions,
    error,
  };
}
