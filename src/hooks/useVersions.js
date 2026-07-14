import {
  useVersionFilters,
  useVersionSelection,
  useInstalledVersions,
  useDownloadableVersions,
  useVersionOperations,
} from "./versions";

export function useVersions() {
  const {
    searchTerm,
    setSearchTerm,
    appSearchTerm,
    setAppSearchTerm,
    showOnlyDownloadableVersions,
    setShowOnlyDownloadableVersions,
    showLTSOnly,
    setShowLTSOnly,
    showMTSOnly,
    setShowMTSOnly,
    showBetaOnly,
    setShowBetaOnly,
  } = useVersionFilters();
  const { versions, filteredVersions, loadVersions } = useInstalledVersions(searchTerm);
  const {
    downloadableVersions,
    isLoadingDownloadableVersions,
    fetchVersionsFromDatagrid,
    refreshVersions,
  } = useDownloadableVersions();
  const { selectedVersion, handleVersionClick } = useVersionSelection();
  const {
    getLoadingStateSync,
    handleLaunchStudioPro,
    handleUninstallStudioPro,
    handleModalDownload,
    isDownloading,
    isUninstalling,
    isLaunching,
  } = useVersionOperations();

  return {
    versions,
    filteredVersions,
    loadVersions,
    downloadableVersions,
    isLoadingDownloadableVersions,
    fetchVersionsFromDatagrid,
    refreshDownloadableVersions: refreshVersions,
    searchTerm,
    setSearchTerm,
    appSearchTerm,
    setAppSearchTerm,
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
    getLoadingStateSync,
    handleLaunchStudioPro,
    handleUninstallStudioPro,
    handleModalDownload,
    isDownloading,
    isUninstalling,
    isLaunching,
  };
}
