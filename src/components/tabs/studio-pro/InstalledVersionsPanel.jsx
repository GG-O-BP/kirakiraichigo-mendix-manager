import * as R from "ramda";
import { memo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import SearchBox from "../../common/SearchBox";
import { renderPanel } from "../../common/Panel";
import { MendixVersionListItem } from "../../common/ListItems";
import { getVersionLoadingState } from "../../../utils";

// Uses consolidated compare_versions command
export const invokeCheckVersionSelected = async (selectedVersion, version) =>
  invoke("compare_versions", {
    comparisonType: "selected",
    value1: selectedVersion,
    value2: version,
    installedVersions: null,
  });

const createVersionSelectionHandler = R.curry(
  (handleClick, version) => () => handleClick(version),
);

const renderEmptyListMessage = (message) => (
  <div className="no-content">
    <span className="berry-icon">🍓</span>
    <p>{message}</p>
  </div>
);

const InstalledVersionItem = memo(({
  version,
  versionLoadingStates,
  handleLaunch,
  handleUninstall,
  handleVersionClick,
  selectedVersion,
}) => {
  const [isSelected, setIsSelected] = useState(false);
  const loadingState = getVersionLoadingState(versionLoadingStates, version.version);

  useEffect(() => {
    if (selectedVersion) {
      invokeCheckVersionSelected(selectedVersion.version, version.version)
        .then(setIsSelected)
        .catch(() => setIsSelected(false));
    } else {
      setIsSelected(false);
    }
  }, [selectedVersion, version.version]);

  return (
    <MendixVersionListItem
      version={version}
      onLaunch={handleLaunch}
      onUninstall={handleUninstall}
      isLaunching={loadingState.isLaunching}
      isUninstalling={loadingState.isUninstalling}
      isSelected={isSelected}
      onClick={createVersionSelectionHandler(handleVersionClick, version)}
    />
  );
});

InstalledVersionItem.displayName = "InstalledVersionItem";

const InstalledVersionsPanel = memo(({
  searchTerm,
  setSearchTerm,
  displayedInstalledVersions,
  versionLoadingStates,
  handleLaunchStudioPro,
  handleUninstallClick,
  handleVersionClick,
  selectedVersion,
}) => {
  const renderVersionsList = () => {
    if (displayedInstalledVersions.length === 0) {
      return renderEmptyListMessage("No installed versions found");
    }

    return displayedInstalledVersions.map((version) => (
      <InstalledVersionItem
        key={`installed-${version.version}`}
        version={version}
        versionLoadingStates={versionLoadingStates}
        handleLaunch={handleLaunchStudioPro}
        handleUninstall={handleUninstallClick}
        handleVersionClick={handleVersionClick}
        selectedVersion={selectedVersion}
      />
    ));
  };

  const searchControls = (
    <div className="search-controls">
      <SearchBox
        placeholder="Search installed versions..."
        value={searchTerm}
        onChange={setSearchTerm}
      />
    </div>
  );

  return renderPanel({
    key: "versions",
    className: "list-container",
    searchControls,
    content: renderVersionsList(),
  });
});

InstalledVersionsPanel.displayName = "InstalledVersionsPanel";

export default InstalledVersionsPanel;
