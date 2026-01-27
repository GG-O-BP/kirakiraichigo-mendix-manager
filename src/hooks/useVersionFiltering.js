import * as R from "ramda";
import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { filterMendixVersions } from "../utils/data-processing/versionFiltering";
import { processAppsPipeline } from "../utils/data-processing/appFiltering";

const DOWNLOADABLE_VERSIONS_PAGE_SIZE = 10;

export const invokeFilterDownloadableVersions = async (
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

export const invokeCalculateNextPageNumber = async (totalItems, itemsPerPage) =>
  invoke("calculate_next_page_number", { totalItems, itemsPerPage });

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
  const [displayedDownloadableVersions, setDisplayedDownloadableVersions] = useState([]);
  const [displayedInstalledVersions, setDisplayedInstalledVersions] = useState([]);
  const [displayedApps, setDisplayedApps] = useState([]);
  const [nextPageNumber, setNextPageNumber] = useState(1);

  useEffect(() => {
    if (installedVersions && installedVersions.length > 0) {
      filterMendixVersions(installedVersions, searchTerm, true)
        .then(setDisplayedInstalledVersions)
        .catch((error) => {
          console.error("Failed to filter versions:", error);
          setDisplayedInstalledVersions(installedVersions);
        });
    } else {
      setDisplayedInstalledVersions([]);
    }
  }, [installedVersions, searchTerm]);

  useEffect(() => {
    if (apps && apps.length > 0) {
      processAppsPipeline(apps, {
        searchTerm: appSearchTerm,
        priorityVersion: selectedVersion?.version,
        onlyValid: true,
      })
        .then(setDisplayedApps)
        .catch((error) => {
          console.error("Failed to filter apps:", error);
          setDisplayedApps(apps);
        });
    } else {
      setDisplayedApps([]);
    }
  }, [apps, appSearchTerm, selectedVersion]);

  useEffect(() => {
    const filterDownloadable = async () => {
      if (!downloadableVersions || downloadableVersions.length === 0) {
        setDisplayedDownloadableVersions([]);
        return;
      }

      try {
        const filtered = await invokeFilterDownloadableVersions(
          downloadableVersions,
          installedVersions || [],
          showOnlyDownloadableVersions,
          showLTSOnly,
          showMTSOnly,
          showBetaOnly,
          R.ifElse(
            R.both(R.complement(R.isNil), R.pipe(R.trim, R.complement(R.isEmpty))),
            R.identity,
            R.always(null),
          )(searchTerm),
        );

        setDisplayedDownloadableVersions(filtered);
      } catch (error) {
        console.error("Failed to filter downloadable versions:", error);
        setDisplayedDownloadableVersions(downloadableVersions);
      }
    };

    filterDownloadable();
  }, [downloadableVersions, installedVersions, showOnlyDownloadableVersions, showLTSOnly, showMTSOnly, showBetaOnly, searchTerm]);

  useEffect(() => {
    if (downloadableVersions && downloadableVersions.length > 0) {
      invokeCalculateNextPageNumber(downloadableVersions.length, DOWNLOADABLE_VERSIONS_PAGE_SIZE)
        .then(setNextPageNumber)
        .catch(() => setNextPageNumber(1));
    }
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
