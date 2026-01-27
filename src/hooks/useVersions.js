import * as R from "ramda";
import {
  useVersionFilters,
  useVersionSelection,
  useInstalledVersions,
  useDownloadableVersions,
  useVersionOperations,
} from "./versions";

export function useVersions() {
  const filters = useVersionFilters();
  const installed = useInstalledVersions(filters.searchTerm);
  const downloadable = useDownloadableVersions();
  const selection = useVersionSelection();
  const operations = useVersionOperations({ onLoadVersions: installed.loadVersions });

  return {
    versions: installed.versions,
    filteredVersions: installed.filteredVersions,
    loadVersions: installed.loadVersions,
    downloadableVersions: downloadable.downloadableVersions,
    isLoadingDownloadableVersions: downloadable.isLoadingDownloadableVersions,
    fetchVersionsFromDatagrid: downloadable.fetchVersionsFromDatagrid,
    refreshDownloadableVersions: downloadable.refreshVersions,
    searchTerm: filters.searchTerm,
    setSearchTerm: filters.setSearchTerm,
    appSearchTerm: filters.appSearchTerm,
    setAppSearchTerm: filters.setAppSearchTerm,
    showOnlyDownloadableVersions: filters.showOnlyDownloadableVersions,
    setShowOnlyDownloadableVersions: filters.setShowOnlyDownloadableVersions,
    showLTSOnly: filters.showLTSOnly,
    setShowLTSOnly: filters.setShowLTSOnly,
    showMTSOnly: filters.showMTSOnly,
    setShowMTSOnly: filters.setShowMTSOnly,
    showBetaOnly: filters.showBetaOnly,
    setShowBetaOnly: filters.setShowBetaOnly,
    selectedVersion: selection.selectedVersion,
    handleVersionClick: selection.handleVersionClick,
    versionLoadingStates: operations.versionLoadingStates,
    setVersionLoadingStates: operations.setVersionLoadingStates,
    getLoadingStateSync: operations.getLoadingStateSync,
    handleLaunchStudioPro: operations.handleLaunchStudioPro,
    handleUninstallStudioPro: operations.handleUninstallStudioPro,
    handleModalDownload: operations.handleModalDownload,
  };
}
