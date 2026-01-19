import * as R from "ramda";
import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  filterMendixVersions,
  filterAndSortAppsWithPriority,
} from "../utils/dataProcessing";

const DOWNLOADABLE_VERSIONS_PAGE_SIZE = 10;

export const invokeExcludeInstalledVersions = async (versions, installedVersions, showOnlyDownloadable) =>
  invoke("exclude_installed_versions", { versions, installedVersions, showOnlyDownloadable });

export const invokeFilterByVersionSupportType = async (versions, showLtsOnly, showMtsOnly, showBetaOnly) =>
  invoke("filter_by_version_support_type", { versions, showLtsOnly, showMtsOnly, showBetaOnly });

export const invokeCalculateNextPageNumber = async (totalItems, itemsPerPage) =>
  invoke("calculate_next_page_number", { totalItems, itemsPerPage });

export const useVersionFiltering = ({
  downloadableVersions,
  installedVersions,
  apps,
  searchTerm,
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

  // Filter installed versions
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

  // Filter and sort apps
  useEffect(() => {
    if (apps && apps.length > 0) {
      filterAndSortAppsWithPriority(
        apps,
        searchTerm,
        selectedVersion?.version
      )
        .then(setDisplayedApps)
        .catch((error) => {
          console.error("Failed to filter apps:", error);
          setDisplayedApps(apps);
        });
    } else {
      setDisplayedApps([]);
    }
  }, [apps, searchTerm, selectedVersion]);

  // Filter downloadable versions
  useEffect(() => {
    const filterDownloadable = async () => {
      if (!downloadableVersions || downloadableVersions.length === 0) {
        setDisplayedDownloadableVersions([]);
        return;
      }

      try {
        let filtered = await invokeExcludeInstalledVersions(
          downloadableVersions,
          installedVersions || [],
          showOnlyDownloadableVersions
        );

        filtered = await invokeFilterByVersionSupportType(
          filtered,
          showLTSOnly,
          showMTSOnly,
          showBetaOnly
        );

        if (searchTerm && searchTerm.trim() !== "") {
          const normalizedSearchTerm = searchTerm.toLowerCase();
          filtered = filtered.filter(v =>
            v.version.toLowerCase().includes(normalizedSearchTerm)
          );
        }

        setDisplayedDownloadableVersions(filtered);
      } catch (error) {
        console.error("Failed to filter downloadable versions:", error);
        setDisplayedDownloadableVersions(downloadableVersions);
      }
    };

    filterDownloadable();
  }, [downloadableVersions, installedVersions, showOnlyDownloadableVersions, showLTSOnly, showMTSOnly, showBetaOnly, searchTerm]);

  // Calculate next page number
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

export default useVersionFiltering;
