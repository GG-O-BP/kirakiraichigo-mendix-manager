import * as R from "ramda";
import { memo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import SearchBox from "../../common/SearchBox";
import { renderPanel } from "../../common/Panel";
import { MendixAppListItem } from "../../common/ListItems";
import { useI18n } from "../../../i18n/useI18n";

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

const AppItem = memo(({ app, selectedVersion, handleClick, onDelete }) => {
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    R.ifElse(
      R.isNotNil,
      (version) =>
        R.pipe(
          () => invokeCheckAppVersionMismatch(R.prop("version", version), R.prop("version", app)),
          R.andThen(setIsDisabled),
          R.otherwise(() => setIsDisabled(false)),
        )(),
      () => setIsDisabled(false),
    )(selectedVersion);
  }, [selectedVersion, R.prop("version", app)]);

  return (
    <MendixAppListItem
      app={app}
      isDisabled={isDisabled}
      onClick={createAppSelectionHandler(handleClick, app)}
      onDelete={onDelete}
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
  onDeleteApp,
}) => {
  const { t } = useI18n();

  const renderAppsList = () =>
    R.ifElse(
      R.isEmpty,
      () =>
        renderEmptyListMessage(
          R.pathOr("No apps found", ["apps", "noAppsFound"], t),
        ),
      R.map((app) => (
        <AppItem
          key={`app-${R.prop("name", app)}`}
          app={app}
          selectedVersion={selectedVersion}
          handleClick={handleItemClick}
          onDelete={onDeleteApp}
        />
      )),
    )(displayedApps);

  const searchControls = (
    <div className="search-controls">
      <SearchBox
        placeholder={R.pathOr("Search apps...", ["apps", "searchApps"], t)}
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
