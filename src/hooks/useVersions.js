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
    setSelectedVersion((prevSelected) =>
      R.ifElse(
        R.both(
          R.complement(R.isNil),
          R.propEq(R.prop("version", version), "version"),
        ),
        R.always(null),
        R.always(version),
      )(prevSelected),
    );
  }, []);

  const handleLaunchStudioPro = useCallback(
    async (version) => {
      const versionId = R.prop("version", version);
      const loadingState = getVersionLoadingState(
        versionLoadingStates,
        versionId,
      );

      const isLoading = R.either(
        R.prop("isLaunching"),
        R.prop("isUninstalling"),
      )(loadingState);

      if (isLoading) {
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

  const handleUninstallStudioPro = useCallback(
    async (version, deleteApps = false, relatedAppsList = [], callbacks = {}) => {
      const onDeleteApp = R.prop("onDeleteApp", callbacks);
      const onComplete = R.prop("onComplete", callbacks);
      const versionId = R.prop("version", version);

      setVersionLoadingStates((prev) =>
        updateVersionLoadingStates(versionId, "uninstall", true, prev),
      );

      const cleanupUninstallState = () => {
        setVersionLoadingStates((prev) =>
          updateVersionLoadingStates(versionId, "uninstall", false, prev),
        );
      };

      try {
        const shouldDeleteApps = R.all(R.identity, [
          deleteApps,
          R.complement(R.isEmpty)(relatedAppsList),
          R.complement(R.isNil)(onDeleteApp),
        ]);

        if (shouldDeleteApps) {
          for (const app of relatedAppsList) {
            await onDeleteApp(R.prop("path", app));
          }
        }

        const result = await invoke("uninstall_studio_pro_and_wait", {
          version: versionId,
          timeoutSeconds: 60,
        });

        await loadVersions();

        R.when(
          R.prop("timed_out"),
          () => console.warn(`Uninstall of Studio Pro ${versionId} timed out, but may still complete`),
        )(result);

        cleanupUninstallState();
        R.when(R.complement(R.isNil), R.call)(onComplete);
      } catch (error) {
        const errorMsg = R.ifElse(
          R.always(deleteApps),
          R.always(`Failed to uninstall Studio Pro ${versionId} with apps: ${error}`),
          R.always(`Failed to uninstall Studio Pro ${versionId}: ${error}`),
        )();
        alert(errorMsg);
        cleanupUninstallState();
        R.when(R.complement(R.isNil), R.call)(onComplete);
      }
    },
    [loadVersions],
  );

  const handleModalDownload = useCallback(
    async (version) => {
      const versionId = R.prop("version", version);
      try {
        setVersionLoadingStates((prev) =>
          updateVersionLoadingStates(versionId, "download", true, prev),
        );

        const result = await invoke("download_and_install_mendix_version", {
          version: versionId,
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
        const term = R.defaultTo(null, searchTerm);
        const filtered = await filterMendixVersions(versions, term, true);
        setFilteredVersions(filtered);
      } catch (error) {
        console.error("Failed to filter versions:", error);
        setFilteredVersions(versions);
      }
    };

    R.ifElse(
      R.complement(R.isEmpty),
      processVersions,
      () => setFilteredVersions([]),
    )(versions);
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
    handleUninstallStudioPro,
    handleModalDownload,
  };
}

export default useVersions;
