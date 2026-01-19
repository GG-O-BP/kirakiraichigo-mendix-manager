import * as R from "ramda";
import { useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  wrapAsync,
  updateVersionLoadingStates,
  getVersionLoadingState,
} from "../utils/functional";
import { filterMendixVersions } from "../utils/dataProcessing";

const LAUNCH_LOADING_RESET_DELAY_MS = 60000;

export function useVersions() {
  const [versions, setVersions] = useState([]);
  const [filteredVersions, setFilteredVersions] = useState([]);
  const [downloadableVersions, setDownloadableVersions] = useState([]);
  const [isLoadingDownloadableVersions, setIsLoadingDownloadableVersions] = useState(false);
  const [showOnlyDownloadableVersions, setShowOnlyDownloadableVersions] = useState(false);
  const [showLTSOnly, setShowLTSOnly] = useState(false);
  const [showMTSOnly, setShowMTSOnly] = useState(false);
  const [showBetaOnly, setShowBetaOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [versionLoadingStates, setVersionLoadingStates] = useState({});

  const hasLoadedInitialVersions = useRef(false);

  const loadVersions = useCallback(
    wrapAsync(
      (error) => console.error("Failed to load versions:", error),
      R.pipeWith(R.andThen, [
        () => invoke("get_installed_mendix_versions"),
        setVersions,
      ]),
    ),
    [],
  );

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

  const handleVersionClick = useCallback((version) => {
    setSelectedVersion((prevSelected) => {
      if (prevSelected && prevSelected.version === version.version) {
        return null;
      }
      return version;
    });
  }, []);

  const handleLaunchStudioPro = useCallback(
    async (version) => {
      const versionId = version.version;
      const loadingState = getVersionLoadingState(
        versionLoadingStates,
        versionId,
      );

      if (loadingState.isLaunching || loadingState.isUninstalling) {
        return;
      }

      setVersionLoadingStates((prev) =>
        updateVersionLoadingStates(versionId, "launch", true, prev),
      );

      try {
        await invoke("launch_studio_pro", {
          version: version.version,
        });
        setTimeout(() => {
          setVersionLoadingStates((prev) =>
            updateVersionLoadingStates(versionId, "launch", false, prev),
          );
        }, LAUNCH_LOADING_RESET_DELAY_MS);
      } catch (error) {
        alert(`Failed to launch Studio Pro: ${error}`);
        setVersionLoadingStates((prev) =>
          updateVersionLoadingStates(versionId, "launch", false, prev),
        );
      }
    },
    [versionLoadingStates],
  );

  const handleDownloadVersion = useCallback((version) => {
    return version;
  }, []);

  const handleModalDownload = useCallback(
    async (version) => {
      const versionId = version.version;
      try {
        setVersionLoadingStates((prev) =>
          updateVersionLoadingStates(versionId, "download", true, prev),
        );

        const result = await invoke("download_and_install_mendix_version", {
          version: version.version,
        });

        await loadVersions();

        return result;
      } catch (error) {
        console.error("Error in download process:", error);
        throw error;
      } finally {
        setVersionLoadingStates((prev) =>
          updateVersionLoadingStates(versionId, "download", false, prev),
        );
      }
    },
    [loadVersions],
  );

  useEffect(() => {
    const processVersions = async () => {
      try {
        const filtered = await filterMendixVersions(
          versions,
          searchTerm || null,
          true,
        );
        setFilteredVersions(filtered);
      } catch (error) {
        console.error("Failed to filter versions:", error);
        setFilteredVersions(versions);
      }
    };

    if (versions && versions.length > 0) {
      processVersions();
    } else {
      setFilteredVersions([]);
    }
  }, [versions, searchTerm]);

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
    versions,
    filteredVersions,
    loadVersions,
    downloadableVersions,
    isLoadingDownloadableVersions,
    fetchVersionsFromDatagrid,
    searchTerm,
    setSearchTerm,
    showOnlyDownloadableVersions,
    setShowOnlyDownloadableVersions,
    showLTSOnly,
    setShowLTSOnly,
    showMTSOnly,
    setShowMTSOnly,
    showBetaOnly,
    setShowBetaOnly,
    selectedVersion,
    handleVersionClick,
    versionLoadingStates,
    setVersionLoadingStates,
    handleLaunchStudioPro,
    handleDownloadVersion,
    handleModalDownload,
  };
}

export default useVersions;
