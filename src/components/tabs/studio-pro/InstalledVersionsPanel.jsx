import * as R from "ramda";
import { memo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import SearchBox from "../../common/SearchBox";
import { renderPanel } from "../../common/Panel";
import { MendixVersionListItem } from "../../common/ListItems";
import { useI18n } from "../../../i18n/useI18n";

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
  getLoadingStateSync,
  handleLaunch,
  handleUninstall,
  handleVersionClick,
  selectedVersion,
}) => {
  const [isSelected, setIsSelected] = useState(false);
  const loadingState = getLoadingStateSync(version.version);

  useEffect(() => {
    R.ifElse(
      R.isNotNil,
      (selected) =>
        R.pipe(
          () => invokeCheckVersionSelected(R.prop("version", selected), R.prop("version", version)),
          R.andThen(setIsSelected),
          R.otherwise(() => setIsSelected(false)),
        )(),
      () => setIsSelected(false),
    )(selectedVersion);
  }, [selectedVersion, R.prop("version", version)]);

  return (
    <MendixVersionListItem
      version={version}
      onLaunch={handleLaunch}
      onUninstall={handleUninstall}
      isLaunching={R.prop("isLaunching", loadingState)}
      isUninstalling={R.prop("isUninstalling", loadingState)}
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
  getLoadingStateSync,
  handleLaunchStudioPro,
  handleUninstallClick,
  handleVersionClick,
  selectedVersion,
}) => {
  const { t } = useI18n();

  const renderVersionsList = () =>
    R.ifElse(
      R.isEmpty,
      () =>
        renderEmptyListMessage(
          R.pathOr("No installed versions found", ["versions", "noInstalledVersions"], t),
        ),
      R.map((version) => (
        <InstalledVersionItem
          key={`installed-${R.prop("version", version)}`}
          version={version}
          getLoadingStateSync={getLoadingStateSync}
          handleLaunch={handleLaunchStudioPro}
          handleUninstall={handleUninstallClick}
          handleVersionClick={handleVersionClick}
          selectedVersion={selectedVersion}
        />
      )),
    )(displayedInstalledVersions);

  const searchControls = (
    <div className="search-controls">
      <SearchBox
        placeholder={R.pathOr("Search installed versions...", ["versions", "searchInstalled"], t)}
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
