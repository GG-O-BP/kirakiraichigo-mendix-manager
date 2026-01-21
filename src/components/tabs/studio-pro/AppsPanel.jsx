import * as R from "ramda";
import { memo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import SearchBox from "../../common/SearchBox";
import { renderPanel } from "../../common/Panel";
import { MendixAppListItem } from "../../common/ListItems";

export const invokeCheckAppVersionMismatch = async (selectedVersion, appVersion) =>
  invoke("compare_versions", {
    comparisonType: "mismatch",
    value1: selectedVersion,
    value2: appVersion,
    installedVersions: null,
  });

const createAppSelectionHandler = R.curry(
  (handleClick, app) => () => handleClick(app),
);

const renderEmptyListMessage = (message) => (
  <div className="no-content">
    <span className="berry-icon">🍓</span>
    <p>{message}</p>
  </div>
);

const AppItem = memo(({ app, selectedVersion, handleClick }) => {
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    if (selectedVersion) {
      invokeCheckAppVersionMismatch(selectedVersion.version, app.version)
        .then(setIsDisabled)
        .catch(() => setIsDisabled(false));
    } else {
      setIsDisabled(false);
    }
  }, [selectedVersion, app.version]);

  return (
    <MendixAppListItem
      app={app}
      isDisabled={isDisabled}
      onClick={createAppSelectionHandler(handleClick, app)}
    />
  );
});

AppItem.displayName = "AppItem";

const AppsPanel = memo(({
  searchTerm,
  setSearchTerm,
  displayedApps,
  selectedVersion,
  handleItemClick,
}) => {
  const renderAppsList = () => {
    if (displayedApps.length === 0) {
      return renderEmptyListMessage("No apps found");
    }

    return displayedApps.map((app) => (
      <AppItem
        key={`app-${app.name}`}
        app={app}
        selectedVersion={selectedVersion}
        handleClick={handleItemClick}
      />
    ));
  };

  const searchControls = (
    <div className="search-controls">
      <SearchBox
        placeholder="Search apps..."
        value={searchTerm}
        onChange={setSearchTerm}
      />
    </div>
  );

  return renderPanel({
    key: "apps",
    className: "list-container",
    searchControls,
    content: renderAppsList(),
  });
});

AppsPanel.displayName = "AppsPanel";

export default AppsPanel;
