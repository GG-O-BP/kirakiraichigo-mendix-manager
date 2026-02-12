import * as R from "ramda";
import { memo, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Dropdown from "../../common/Dropdown";
import SearchBox from "../../common/SearchBox";
import { renderLoadingIndicator } from "../../common/LoadingIndicator";
import { renderPanel } from "../../common/Panel";
import { useI18n } from "../../../i18n/useI18n";

const UNINSTALL_BUTTON_GRADIENT = {
  background: "linear-gradient(135deg, rgba(220, 20, 60, 0.2) 0%, rgba(220, 20, 60, 0.3) 100%)",
  borderColor: "rgba(220, 20, 60, 0.4)",
};

const INLINE_FLEX_GAP = { display: "flex", gap: "8px" };

const invokeCreateVersionOptions = async (versions) =>
  invoke("create_version_options", { versions });

const invokeFormatDate = async (dateStr) =>
  invoke("format_date", { dateStr });

const createAppClickHandler = R.curry((handleAppClick, app, e) =>
  R.pipe(
    R.tap(() => e.preventDefault()),
    R.tap(() => e.stopPropagation()),
    R.always(app),
    handleAppClick,
  )(),
);

const executeWithStoppedPropagation = R.curry((onClick, e) =>
  R.pipe(
    R.tap((e) => e.stopPropagation()),
    R.tap(() => onClick()),
    R.always(undefined),
  )(e),
);

const getAppClassName = (isSelected) =>
  R.join(" ", [
    "version-list-item",
    "widget-item-clickable",
    isSelected ? "selected" : "",
  ]);

const renderVersionBadge = R.ifElse(
  R.prop("version"),
  (app) => (
    <span className="version-badge app-version">v{R.prop("version", app)}</span>
  ),
  R.always(null),
);

const renderAppDeleteButton = R.curry((onDelete, app, t) => (
  <button
    className="install-button uninstall-button"
    onClick={executeWithStoppedPropagation(() => onDelete(app))}
    style={UNINSTALL_BUTTON_GRADIENT}
    title={R.pathOr("Delete app", ["apps", "deleteApp"], t)}
  >
    <span className="button-icon">🗑️</span>
  </button>
));

const AppListItem = memo(({ app, isSelected, handleAppClick, onDelete, t }) => {
  const [formattedDate, setFormattedDate] = useState(R.pathOr("Loading...", ["common", "loading"], t));

  useEffect(() => {
    invokeFormatDate(app.last_modified)
      .then(setFormattedDate)
      .catch(() => setFormattedDate(R.pathOr("Date unknown", ["common", "dateUnknown"], t)));
  }, [app.last_modified, t]);

  const icon = isSelected ? "☑️" : "📁";

  return (
    <div
      className={getAppClassName(isSelected)}
      onClick={createAppClickHandler(handleAppClick, app)}
    >
      <div className="version-info">
        <span className="version-icon">{icon}</span>
        <div className="version-details">
          <span className="version-number">{R.prop("name", app)}</span>
          <span className="version-date">
            {renderVersionBadge(app)}
            {formattedDate}
          </span>
        </div>
      </div>
      {R.complement(R.isNil)(onDelete) && (
        <div style={INLINE_FLEX_GAP}>
          {renderAppDeleteButton(onDelete, app, t)}
        </div>
      )}
    </div>
  );
});

AppListItem.displayName = "AppListItem";

const renderAppsList = R.curry((isAppSelected, handleAppClick, onDelete, apps, t) =>
  R.ifElse(
    R.isEmpty,
    () => renderLoadingIndicator("🍓", R.pathOr("No Mendix apps found", ["apps", "noAppsFound"], t)),
    (appList) => R.map(
      (app) => (
        <AppListItem
          key={R.prop("path", app)}
          app={app}
          isSelected={isAppSelected(app)}
          handleAppClick={handleAppClick}
          onDelete={onDelete}
          t={t}
        />
      ),
      appList
    ),
  )(apps),
);

const AppsSelectionPanel = memo(({
  versions,
  filteredApps,
  appSearchTerm,
  setAppSearchTerm,
  versionFilter,
  setVersionFilter,
  handleAppClick,
  onDeleteApp,
  isAppSelected,
}) => {
  const { t } = useI18n();
  const defaultVersionFilter = {
    value: "all",
    label: R.pathOr("All Versions", ["apps", "allVersions"], t),
  };
  const [versionOptions, setVersionOptions] = useState([defaultVersionFilter]);

  useEffect(() => {
    if (versions && versions.length > 0) {
      invokeCreateVersionOptions(versions)
        .then(setVersionOptions)
        .catch(() => setVersionOptions([defaultVersionFilter]));
    }
  }, [versions]);

  const searchControls = (
    <div className="search-controls">
      <Dropdown
        value={versionFilter}
        onChange={setVersionFilter}
        options={versionOptions}
      />
      <div className="search-row">
        <SearchBox
          placeholder={R.pathOr("Search Mendix apps...", ["apps", "searchApps"], t)}
          value={appSearchTerm}
          onChange={setAppSearchTerm}
        />
      </div>
    </div>
  );

  return renderPanel({
    key: "apps",
    className: "list-container",
    searchControls,
    content: renderAppsList(isAppSelected, handleAppClick, onDeleteApp, filteredApps, t),
  });
});

AppsSelectionPanel.displayName = "AppsSelectionPanel";

export default AppsSelectionPanel;
