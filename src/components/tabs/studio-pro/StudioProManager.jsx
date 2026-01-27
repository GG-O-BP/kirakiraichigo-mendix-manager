import { memo } from "react";
import { useSetAtom } from "jotai";
import { useVersionFiltering } from "../../../hooks";
import { useVersionsContext, useAppContext } from "../../../contexts";
import {
  openDownloadModalAtom,
  openAppDeleteModalAtom,
  useUninstallModalActions,
} from "../../../atoms";
import DownloadableVersionsPanel from "./DownloadableVersionsPanel";
import InstalledVersionsPanel from "./InstalledVersionsPanel";
import AppsPanel from "./AppsPanel";

const StudioProManager = memo(() => {
  const {
    searchTerm,
    setSearchTerm,
    appSearchTerm,
    setAppSearchTerm,
    versions,
    selectedVersion,
    handleVersionClick,
    downloadableVersions,
    isLoadingDownloadableVersions,
    getLoadingStateSync,
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

  const openDownloadModal = useSetAtom(openDownloadModalAtom);
  const openAppDeleteModal = useSetAtom(openAppDeleteModalAtom);
  const { openUninstallModal } = useUninstallModalActions();
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
    appSearchTerm,
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
        getLoadingStateSync={getLoadingStateSync}
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
        getLoadingStateSync={getLoadingStateSync}
        handleLaunchStudioPro={handleLaunchStudioPro}
        handleUninstallClick={openUninstallModal}
        handleVersionClick={handleVersionClick}
        selectedVersion={selectedVersion}
      />
      <AppsPanel
        searchTerm={appSearchTerm}
        setSearchTerm={setAppSearchTerm}
        displayedApps={displayedApps}
        selectedVersion={selectedVersion}
        onDeleteApp={openAppDeleteModal}
      />
    </div>
  );
});

StudioProManager.displayName = "StudioProManager";

export default StudioProManager;
