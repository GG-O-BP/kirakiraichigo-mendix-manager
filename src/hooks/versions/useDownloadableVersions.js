import * as R from "ramda";
import { useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useDownloadableVersions() {
  const [downloadableVersions, setDownloadableVersions] = useState([]);
  const [isLoadingDownloadableVersions, setIsLoadingDownloadableVersions] = useState(false);

  const hasLoadedInitialVersions = useRef(false);

  const fetchVersionsFromDatagrid = useCallback(async (page = 1) => {
    const isFirstPage = page === 1;

    const updateVersions = (newVersions, prevVersions) =>
      isFirstPage
        ? newVersions
        : R.concat(R.defaultTo([], prevVersions), newVersions);

    try {
      const processedPage = R.pipe(R.defaultTo(1), R.max(1))(page);

      setIsLoadingDownloadableVersions(true);

      const versions = await invoke("get_downloadable_versions_from_datagrid", {
        page: processedPage,
      });

      setDownloadableVersions((prevVersions) =>
        updateVersions(versions, prevVersions),
      );

      setIsLoadingDownloadableVersions(false);
      return versions;
    } catch (error) {
      console.error("Failed to fetch versions from datagrid:", error);
      setIsLoadingDownloadableVersions(false);
      return [];
    }
  }, []);

  useEffect(() => {
    if (hasLoadedInitialVersions.current) {
      return;
    }

    const loadInitialDownloadableVersions = async () => {
      try {
        hasLoadedInitialVersions.current = true;
        await fetchVersionsFromDatagrid(1);
      } catch (error) {
        console.error("Failed to load initial downloadable versions:", error);
        hasLoadedInitialVersions.current = false;
      }
    };

    loadInitialDownloadableVersions();
  }, [fetchVersionsFromDatagrid]);

  return {
    downloadableVersions,
    isLoadingDownloadableVersions,
    fetchVersionsFromDatagrid,
  };
}
