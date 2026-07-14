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
    onSuccess: () => {
      R.when(
        () => R.not(hasLoadedInitialVersions),
        () => {
          hasLoadedInitialVersions = true;
          fetchVersionsFromDatagrid(1);
        },
      )(null);
    },
  });

  const fetchVersionsFromDatagrid = useCallback(
    (page = 1) =>
      R.pipe(
        () =>
          invoke("get_downloadable_versions_from_datagrid", {
            page: R.pipe(R.defaultTo(1), R.max(1))(page),
          }),
        R.andThen((versions) =>
          R.pipe(
            () => invoke("merge_and_save_downloadable_versions", { fresh: versions }),
            R.andThen(
              R.pipe(
                R.tap((merged) => mutate(merged, false)),
                R.always(versions),
              ),
            ),
          )(),
        ),
        R.otherwise(
          R.pipe(
            R.tap((err) => console.error("Failed to fetch versions from datagrid:", err)),
            R.always([]),
          ),
        ),
      )(),
    [mutate],
  );

  const clearCache = useCallback(
    () =>
      R.pipe(
        () => invoke("clear_downloadable_versions_cache"),
        R.andThen(
          R.pipe(
            R.tap(() => mutate([], false)),
            R.tap(() => {
              hasLoadedInitialVersions = false;
            }),
            R.always(true),
          ),
        ),
        R.otherwise(
          R.pipe(
            R.tap((err) => console.error("Failed to clear cache:", err)),
            R.always(false),
          ),
        ),
      )(),
    [mutate],
  );

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
