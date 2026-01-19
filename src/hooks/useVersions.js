import * as R from "ramda";
import {
  useVersionFilters,
  useVersionSelection,
  useInstalledVersions,
  useDownloadableVersions,
  useVersionOperations,
} from "./versions";

/**
 * useVersions - Composition hook that combines all version-related hooks
 * Maintains backward compatibility with existing consumers
 */
export function useVersions() {
  const filters = useVersionFilters();
  const installed = useInstalledVersions(filters.searchTerm);
  const downloadable = useDownloadableVersions();
  const selection = useVersionSelection();
  const operations = useVersionOperations({ onLoadVersions: installed.loadVersions });

  return {
    // From useInstalledVersions
    versions: installed.versions,
    filteredVersions: installed.filteredVersions,
    loadVersions: installed.loadVersions,
    // From useDownloadableVersions
    downloadableVersions: downloadable.downloadableVersions,
    isLoadingDownloadableVersions: downloadable.isLoadingDownloadableVersions,
    fetchVersionsFromDatagrid: downloadable.fetchVersionsFromDatagrid,
    // From useVersionFilters
    searchTerm: filters.searchTerm,
    setSearchTerm: filters.setSearchTerm,
    showOnlyDownloadableVersions: filters.showOnlyDownloadableVersions,
    setShowOnlyDownloadableVersions: filters.setShowOnlyDownloadableVersions,
    showLTSOnly: filters.showLTSOnly,
    setShowLTSOnly: filters.setShowLTSOnly,
    showMTSOnly: filters.showMTSOnly,
    setShowMTSOnly: filters.setShowMTSOnly,
    showBetaOnly: filters.showBetaOnly,
    setShowBetaOnly: filters.setShowBetaOnly,
    // From useVersionSelection
    selectedVersion: selection.selectedVersion,
    handleVersionClick: selection.handleVersionClick,
    // From useVersionOperations
    versionLoadingStates: operations.versionLoadingStates,
    setVersionLoadingStates: operations.setVersionLoadingStates,
    handleLaunchStudioPro: operations.handleLaunchStudioPro,
    handleUninstallStudioPro: operations.handleUninstallStudioPro,
    handleModalDownload: operations.handleModalDownload,
  };
}

export default useVersions;
