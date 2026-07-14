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

const fetchFilteredDownloadable = (key) => {
  const {
    downloadableVersions,
    installedVersions,
    showOnlyDownloadableVersions,
    showLTSOnly,
    showMTSOnly,
    showBetaOnly,
    searchTerm,
  } = JSON.parse(R.nth(1, key));

  const normalizedSearchTerm = R.ifElse(
    R.both(R.isNotNil, R.pipe(R.trim, R.isNotEmpty)),
    R.identity,
    R.always(null),
  )(searchTerm);

  return R.ifElse(
    R.either(R.isNil, R.isEmpty),
    R.always([]),
    () =>
      R.pipe(
        () =>
          invokeFilterDownloadableVersions(
            downloadableVersions,
            R.defaultTo([], installedVersions),
            showOnlyDownloadableVersions,
            showLTSOnly,
            showMTSOnly,
            showBetaOnly,
            normalizedSearchTerm,
          ),
        R.otherwise(
          R.pipe(
            R.tap((error) => console.error("Failed to filter downloadable versions:", error)),
            R.always(downloadableVersions),
          ),
        ),
      )(),
  )(downloadableVersions);
};

const fetchFilteredInstalled = (key) => {
  const { installedVersions, searchTerm } = JSON.parse(R.nth(1, key));

  return R.ifElse(
    R.either(R.isNil, R.isEmpty),
    R.always([]),
    () =>
      R.pipe(
        () => filterMendixVersions(installedVersions, searchTerm, true),
        R.otherwise(
          R.pipe(
            R.tap((error) => console.error("Failed to filter versions:", error)),
            R.always(installedVersions),
          ),
        ),
      )(),
  )(installedVersions);
};

const fetchFilteredApps = (key) => {
  const { apps, appSearchTerm, selectedVersion } = JSON.parse(R.nth(1, key));

  return R.ifElse(
    R.either(R.isNil, R.isEmpty),
    R.always([]),
    () =>
      R.pipe(
        () =>
          processAppsPipeline(apps, {
            searchTerm: appSearchTerm,
            priorityVersion: R.path(["version"], selectedVersion),
            onlyValid: true,
          }),
        R.otherwise(
          R.pipe(
            R.tap((error) => console.error("Failed to filter apps:", error)),
            R.always(apps),
          ),
        ),
      )(),
  )(apps);
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

  const nextPageNumber = useMemo(
    () =>
      R.ifElse(
        R.either(R.isNil, R.isEmpty),
        R.always(1),
        R.pipe(
          R.length,
          (count) => Math.ceil(R.divide(count, DOWNLOADABLE_VERSIONS_PAGE_SIZE)),
          R.inc,
        ),
      )(downloadableVersions),
    [downloadableVersions],
  );

  const createLoadMoreHandler = useCallback(
    () =>
      R.ifElse(
        R.both(R.isNotNil, () => R.gt(nextPageNumber, 0)),
        (fetchVersions) => () => fetchVersions(nextPageNumber),
        R.always(null),
      )(fetchVersionsFromDatagrid),
    [fetchVersionsFromDatagrid, nextPageNumber],
  );

  return {
    displayedDownloadableVersions,
    displayedInstalledVersions,
    displayedApps,
    nextPageNumber,
    loadMoreHandler: createLoadMoreHandler(),
  };
};
