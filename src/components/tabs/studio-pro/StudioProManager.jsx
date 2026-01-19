import * as R from "ramda";
import { memo } from "react";
import { useVersionFiltering } from "../../../hooks";
import DownloadableVersionsPanel from "./DownloadableVersionsPanel";
import InstalledVersionsPanel from "./InstalledVersionsPanel";
import AppsPanel from "./AppsPanel";

const StudioProManager = memo(
  ({
    searchTerm,
    setSearchTerm,
    versions,
    selectedVersion,
    handleVersionClick,
    apps,
    downloadableVersions,
    isLoadingDownloadableVersions,
    versionLoadingStates,
    handleLaunchStudioPro,
    handleUninstallClick,
    handleItemClick,
    handleDownloadVersion,
    fetchVersionsFromDatagrid,
    showOnlyDownloadableVersions,
    setShowOnlyDownloadableVersions,
    showLTSOnly,
    setShowLTSOnly,
    showMTSOnly,
    setShowMTSOnly,
    showBetaOnly,
    setShowBetaOnly,
  }) => {
    const {
      displayedDownloadableVersions,
      displayedInstalledVersions,
      displayedApps,
      loadMoreHandler,
    } = useVersionFiltering({
      downloadableVersions,
      installedVersions: versions,
      apps,
      searchTerm,
      showLTSOnly,
      showMTSOnly,
      showBetaOnly,
      showOnlyDownloadableVersions,
      selectedVersion,
      fetchVersionsFromDatagrid,
    });

    return (
      <div className="studio-pro-manager base-manager">
        <DownloadableVersionsPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          displayedDownloadableVersions={displayedDownloadableVersions}
          installedVersions={versions}
          versionLoadingStates={versionLoadingStates}
          handleDownloadVersion={handleDownloadVersion}
          loadMoreHandler={loadMoreHandler}
          isLoadingDownloadableVersions={isLoadingDownloadableVersions}
          totalDownloadableCount={downloadableVersions?.length || 0}
          showOnlyDownloadableVersions={showOnlyDownloadableVersions}
          setShowOnlyDownloadableVersions={setShowOnlyDownloadableVersions}
          showLTSOnly={showLTSOnly}
          setShowLTSOnly={setShowLTSOnly}
          showMTSOnly={showMTSOnly}
          setShowMTSOnly={setShowMTSOnly}
          showBetaOnly={showBetaOnly}
          setShowBetaOnly={setShowBetaOnly}
        />
        <InstalledVersionsPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          displayedInstalledVersions={displayedInstalledVersions}
          versionLoadingStates={versionLoadingStates}
          handleLaunchStudioPro={handleLaunchStudioPro}
          handleUninstallClick={handleUninstallClick}
          handleVersionClick={handleVersionClick}
          selectedVersion={selectedVersion}
        />
        <AppsPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          displayedApps={displayedApps}
          selectedVersion={selectedVersion}
          handleItemClick={handleItemClick}
        />
      </div>
    );
  },
);

StudioProManager.displayName = "StudioProManager";

export default StudioProManager;
