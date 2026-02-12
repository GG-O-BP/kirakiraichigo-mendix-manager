import * as R from "ramda";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";
import { SWR_KEYS } from "../lib/swr";
import { filterMendixVersions } from "../utils/data-processing/versionFiltering";
import { processAppsPipeline } from "../utils/data-processing/appFiltering";

const DOWNLOADABLE_VERSIONS_PAGE_SIZE = 10;

const invokeFilterDownloadableVersions = async (
  versions,
  installedVersions,
  showOnlyDownloadable,
  showLtsOnly,
  showMtsOnly,
  showBetaOnly,
  searchTerm,
) =>
  invoke("filter_downloadable_versions", {
    versions,
    installedVersions,
    showOnlyDownloadable,
    showLtsOnly,
    showMtsOnly,
    showBetaOnly,
    searchTerm,
  });

const fetchFilteredDownloadable = async (key) => {
  const deps = JSON.parse(key[1]);
  const {
    downloadableVersions,
    installedVersions,
    showOnlyDownloadableVersions,
    showLTSOnly,
    showMTSOnly,
    showBetaOnly,
    searchTerm,
  } = deps;

  if (R.or(R.isNil(downloadableVersions), R.isEmpty(downloadableVersions))) {
    return [];
  }

  try {
    const normalizedSearchTerm = R.ifElse(
      R.both(R.complement(R.isNil), R.pipe(R.trim, R.complement(R.isEmpty))),
      R.identity,
      R.always(null),
    )(searchTerm);

    return await invokeFilterDownloadableVersions(
      downloadableVersions,
      R.defaultTo([], installedVersions),
      showOnlyDownloadableVersions,
      showLTSOnly,
      showMTSOnly,
      showBetaOnly,
      normalizedSearchTerm,
    );
  } catch (error) {
    console.error("Failed to filter downloadable versions:", error);
    return downloadableVersions;
  }
};

const fetchFilteredInstalled = async (key) => {
  const deps = JSON.parse(key[1]);
  const { installedVersions, searchTerm } = deps;

  if (R.or(R.isNil(installedVersions), R.isEmpty(installedVersions))) {
    return [];
  }

  try {
    return await filterMendixVersions(installedVersions, searchTerm, true);
  } catch (error) {
    console.error("Failed to filter versions:", error);
    return installedVersions;
  }
};

const fetchFilteredApps = async (key) => {
  const deps = JSON.parse(key[1]);
  const { apps, appSearchTerm, selectedVersion } = deps;

  if (R.or(R.isNil(apps), R.isEmpty(apps))) {
    return [];
  }

  try {
    return await processAppsPipeline(apps, {
      searchTerm: appSearchTerm,
      priorityVersion: R.path(["version"], selectedVersion),
      onlyValid: true,
    });
  } catch (error) {
    console.error("Failed to filter apps:", error);
    return apps;
  }
};

export const useVersionFiltering = ({
  downloadableVersions,
  installedVersions,
  apps,
  searchTerm,
  appSearchTerm,
  showLTSOnly,
  showMTSOnly,
  showBetaOnly,
  showOnlyDownloadableVersions,
  selectedVersion,
  fetchVersionsFromDatagrid,
}) => {
  const downloadableDeps = useMemo(
    () => ({
      downloadableVersions,
      installedVersions,
      showOnlyDownloadableVersions,
      showLTSOnly,
      showMTSOnly,
      showBetaOnly,
      searchTerm,
    }),
    [downloadableVersions, installedVersions, showOnlyDownloadableVersions, showLTSOnly, showMTSOnly, showBetaOnly, searchTerm],
  );

  const installedDeps = useMemo(
    () => ({ installedVersions, searchTerm }),
    [installedVersions, searchTerm],
  );

  const appsDeps = useMemo(
    () => ({ apps, appSearchTerm, selectedVersion }),
    [apps, appSearchTerm, selectedVersion],
  );

  const { data: displayedDownloadableVersions = [] } = useSWR(
    SWR_KEYS.FILTERED_DOWNLOADABLE(downloadableDeps),
    fetchFilteredDownloadable,
  );

  const { data: displayedInstalledVersions = [] } = useSWR(
    SWR_KEYS.FILTERED_INSTALLED(installedDeps),
    fetchFilteredInstalled,
  );

  const { data: displayedApps = [] } = useSWR(
    SWR_KEYS.FILTERED_APPS(appsDeps),
    fetchFilteredApps,
  );

  const nextPageNumber = useMemo(() => {
    if (R.or(R.isNil(downloadableVersions), R.isEmpty(downloadableVersions))) {
      return 1;
    }
    return Math.ceil(R.length(downloadableVersions) / DOWNLOADABLE_VERSIONS_PAGE_SIZE) + 1;
  }, [downloadableVersions]);

  const createLoadMoreHandler = useCallback(() => {
    if (fetchVersionsFromDatagrid && nextPageNumber > 0) {
      return () => fetchVersionsFromDatagrid(nextPageNumber);
    }
    return null;
  }, [fetchVersionsFromDatagrid, nextPageNumber]);

  return {
    displayedDownloadableVersions,
    displayedInstalledVersions,
    displayedApps,
    nextPageNumber,
    loadMoreHandler: createLoadMoreHandler(),
  };
};
