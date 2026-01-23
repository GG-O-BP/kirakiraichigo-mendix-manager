import { memo } from "react";
import { useVersionFiltering } from "../../../hooks";
import { useVersionsContext, useModalContext, useAppContext } from "../../../contexts";
import DownloadableVersionsPanel from "./DownloadableVersionsPanel";
import InstalledVersionsPanel from "./InstalledVersionsPanel";
import AppsPanel from "./AppsPanel";

const StudioProManager = memo(() => {
  const {
    searchTerm,
    setSearchTerm,
    versions,
    selectedVersion,
    handleVersionClick,
    downloadableVersions,
    isLoadingDownloadableVersions,
    versionLoadingStates,
    handleLaunchStudioPro,
    fetchVersionsFromDatagrid,
    refreshDownloadableVersions,
    showOnlyDownloadableVersions,
    setShowOnlyDownloadableVersions,
    showLTSOnly,
    setShowLTSOnly,
    showMTSOnly,
    setShowMTSOnly,
    showBetaOnly,
    setShowBetaOnly,
  } = useVersionsContext();

  const { openUninstallModal, openDownloadModal, openAppDeleteModal } = useModalContext();
  const { apps } = useAppContext();

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
        handleDownloadVersion={openDownloadModal}
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
        onRefreshCache={refreshDownloadableVersions}
      />
      <InstalledVersionsPanel
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        displayedInstalledVersions={displayedInstalledVersions}
        versionLoadingStates={versionLoadingStates}
        handleLaunchStudioPro={handleLaunchStudioPro}
        handleUninstallClick={openUninstallModal}
        handleVersionClick={handleVersionClick}
        selectedVersion={selectedVersion}
      />
      <AppsPanel
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        displayedApps={displayedApps}
        selectedVersion={selectedVersion}
        onDeleteApp={openAppDeleteModal}
      />
    </div>
  );
});

StudioProManager.displayName = "StudioProManager";

export default StudioProManager;
