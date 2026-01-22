import * as R from "ramda";
import { useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useDownloadableVersions() {
  const [downloadableVersions, setDownloadableVersions] = useState([]);
  const [isLoadingDownloadableVersions, setIsLoadingDownloadableVersions] =
    useState(false);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);

  const hasLoadedInitialVersions = useRef(false);

  const loadCachedVersions = useCallback(async () => {
    try {
      const cached = await invoke("load_downloadable_versions_cache");
      R.when(
        R.complement(R.isEmpty),
        R.tap(setDownloadableVersions),
      )(cached);
      return cached;
    } catch (error) {
      console.error("Failed to load cached versions:", error);
      return [];
    }
  }, []);

  const fetchVersionsFromDatagrid = useCallback(async (page = 1) => {
    const isFirstPage = R.equals(page, 1);

    try {
      const processedPage = R.pipe(R.defaultTo(1), R.max(1))(page);

      setIsLoadingDownloadableVersions(true);

      const versions = await invoke("get_downloadable_versions_from_datagrid", {
        page: processedPage,
      });

      const merged = await invoke("merge_and_save_downloadable_versions", {
        fresh: versions,
      });

      R.when(
        R.always(isFirstPage),
        R.always(setDownloadableVersions(merged)),
      )(null);

      R.unless(
        R.always(isFirstPage),
        R.always(setDownloadableVersions(merged)),
      )(null);

      setIsLoadingDownloadableVersions(false);
      return versions;
    } catch (error) {
      console.error("Failed to fetch versions from datagrid:", error);
      setIsLoadingDownloadableVersions(false);
      return [];
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await invoke("clear_downloadable_versions_cache");
      setDownloadableVersions([]);
      hasLoadedInitialVersions.current = false;
      return true;
    } catch (error) {
      console.error("Failed to clear cache:", error);
      return false;
    }
  }, []);

  const refreshVersions = useCallback(async () => {
    await clearCache();
    return fetchVersionsFromDatagrid(1);
  }, [clearCache, fetchVersionsFromDatagrid]);

  useEffect(() => {
    R.when(
      R.always(hasLoadedInitialVersions.current),
      R.always(undefined),
    )(null);

    if (hasLoadedInitialVersions.current) {
      return;
    }

    const loadInitialDownloadableVersions = async () => {
      try {
        hasLoadedInitialVersions.current = true;

        const cached = await loadCachedVersions();
        setIsCacheLoaded(true);

        R.when(
          R.complement(R.isEmpty),
          R.always(fetchVersionsFromDatagrid(1)),
        )(cached);

        R.when(R.isEmpty, R.always(fetchVersionsFromDatagrid(1)))(cached);
      } catch (error) {
        console.error("Failed to load initial downloadable versions:", error);
        hasLoadedInitialVersions.current = false;
      }
    };

    loadInitialDownloadableVersions();
  }, [fetchVersionsFromDatagrid, loadCachedVersions]);

  return {
    downloadableVersions,
    isLoadingDownloadableVersions,
    isCacheLoaded,
    fetchVersionsFromDatagrid,
    clearCache,
    refreshVersions,
  };
}
