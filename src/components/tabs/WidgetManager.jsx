import * as R from "ramda";
import { memo } from "react";
import Dropdown from "../common/Dropdown";
import SearchBox from "../common/SearchBox";

// ============= Helper Functions =============

// Create version options for dropdown
const createVersionOptions = R.pipe(
  R.map((v) => ({
    value: R.prop("version", v),
    label: `📦 ${R.prop("version", v)}`,
  })),
  R.prepend({ value: "all", label: "🍓 All Versions" }),
);

// Get paginated slice of items
const getPaginatedSlice = R.curry((itemsPerPage, currentPage, items) =>
  R.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage, items),
);

// Check if app is selected
const isAppSelected = R.curry((selectedApps, app) =>
  selectedApps.has(R.prop("path", app)),
);

// Check if widget is selected
const isWidgetSelected = R.curry((selectedWidgets, widget) =>
  selectedWidgets.has(R.prop("id", widget)),
);

// Format date or return default
const formatDate = R.pipe(
  R.prop("last_modified"),
  R.ifElse(
    R.identity,
    (date) => new Date(date).toLocaleDateString(),
    R.always("Date unknown"),
  ),
);

// Create app class name
const getAppClassName = R.curry((selectedApps, app) =>
  R.join(" ", [
    "version-list-item",
    isAppSelected(selectedApps, app) ? "selected" : "",
  ]),
);

// Create widget class name
const getWidgetClassName = R.curry((selectedWidgets, widget) =>
  R.join(" ", [
    "version-list-item",
    isWidgetSelected(selectedWidgets, widget) ? "selected" : "",
  ]),
);

// ============= Render Functions =============

// Render app icon based on selection
const renderAppIcon = R.curry((selectedApps, app) =>
  isAppSelected(selectedApps, app) ? "☑️" : "📁",
);

// Render widget icon based on selection
const renderWidgetIcon = R.curry((selectedWidgets, widget) =>
  isWidgetSelected(selectedWidgets, widget) ? "☑️" : "🧩",
);

// Render app version badge
const renderVersionBadge = R.ifElse(
  R.prop("version"),
  (app) => <span className="version-badge mts">v{R.prop("version", app)}</span>,
  R.always(null),
);

// Render empty state
const renderEmptyState = R.curry((icon, message) => (
  <div className="loading-indicator">
    <span className="loading-icon">{icon}</span>
    <span>{message}</span>
  </div>
));

// Render load more indicator
const renderLoadMore = R.curry((onClick) => (
  <div className="end-indicator" onClick={onClick}>
    <span>Load more apps...</span>
  </div>
));

// Render single app item
const renderAppItem = R.curry((selectedApps, handleAppClick, app) => (
  <div
    key={R.prop("path", app)}
    className={getAppClassName(selectedApps, app)}
    onClick={() => handleAppClick(app)}
    style={{ cursor: "pointer" }}
  >
    <div className="version-info">
      <span className="version-icon">{renderAppIcon(selectedApps, app)}</span>
      <div className="version-details">
        <span className="version-number">
          {R.prop("name", app)}
          {renderVersionBadge(app)}
        </span>
        <span className="version-date">{formatDate(app)}</span>
      </div>
    </div>
    <div className="app-actions">
      <span className="item-sparkle">✨</span>
    </div>
  </div>
));

// Render package manager option
const renderPackageManagerOption = R.curry(
  (packageManager, setPackageManager, pm) => (
    <label
      key={pm}
      style={{
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        color: "rgba(255, 235, 240, 0.9)",
      }}
    >
      <input
        type="radio"
        name="packageManager"
        value={pm}
        checked={R.equals(packageManager, pm)}
        onChange={R.pipe(R.path(["target", "value"]), setPackageManager)}
        style={{ marginRight: "5px" }}
      />
      {pm}
    </label>
  ),
);

// Render widget item
const renderWidgetItem = R.curry(
  (selectedWidgets, setSelectedWidgets, setWidgets, widget) => (
    <div
      key={R.prop("id", widget)}
      className={getWidgetClassName(selectedWidgets, widget)}
      onClick={() => {
        const widgetId = R.prop("id", widget);
        setSelectedWidgets((prev) => {
          const newSet = new Set(prev);
          R.ifElse(
            () => newSet.has(widgetId),
            () => newSet.delete(widgetId),
            () => newSet.add(widgetId),
          )();

          R.pipe(
            Array.from,
            R.tap((arr) =>
              console.log("Saving selected widgets to localStorage:", arr),
            ),
            (arr) =>
              localStorage.setItem(
                "kirakiraSelectedWidgets",
                JSON.stringify(arr),
              ),
          )(newSet);

          return newSet;
        });
      }}
      style={{ cursor: "pointer" }}
    >
      <div className="version-info">
        <span className="version-icon">
          {renderWidgetIcon(selectedWidgets, widget)}
        </span>
        <div className="version-details">
          <span className="version-number">{R.prop("caption", widget)}</span>
          <span className="version-date">{R.prop("path", widget)}</span>
        </div>
      </div>
      <button
        className="uninstall-button"
        onClick={R.pipe(
          R.tap((e) => e.stopPropagation()),
          () => {
            setWidgets((prev) =>
              R.pipe(
                R.reject(R.propEq("id", R.prop("id", widget))),
                R.tap((newWidgets) =>
                  localStorage.setItem(
                    "kirakiraWidgets",
                    JSON.stringify(newWidgets),
                  ),
                ),
              )(prev),
            );

            setSelectedWidgets((prev) => {
              const newSet = new Set(prev);
              newSet.delete(R.prop("id", widget));

              R.pipe(Array.from, (arr) =>
                localStorage.setItem(
                  "kirakiraSelectedWidgets",
                  JSON.stringify(arr),
                ),
              )(newSet);

              return newSet;
            });
          },
        )}
        style={{
          background:
            "linear-gradient(135deg, rgba(220, 20, 60, 0.2) 0%, rgba(220, 20, 60, 0.3) 100%)",
          borderColor: "rgba(220, 20, 60, 0.4)",
          padding: "4px 12px",
          fontSize: "12px",
        }}
      >
        <span className="button-icon">🗑️</span>
      </button>
    </div>
  ),
);

// Get button opacity based on conditions
const getButtonOpacity = R.cond([
  [R.equals(true), R.always(1)],
  [R.T, R.always(0.5)],
]);

// ============= Main Component =============

const WidgetManager = memo(
  ({
    versionFilter,
    setVersionFilter,
    versions,
    appSearchTerm,
    setAppSearchTerm,
    filteredApps,
    currentPage,
    setCurrentPage,
    hasMore,
    ITEMS_PER_PAGE,
    selectedApps,
    handleAppClick,
    packageManager,
    setPackageManager,
    handleInstall,
    handleBuildDeploy,
    isInstalling,
    isBuilding,
    selectedWidgets,
    setSelectedWidgets,
    widgets,
    filteredWidgets,
    widgetSearchTerm,
    setWidgetSearchTerm,
    setShowWidgetModal,
    setShowAddWidgetForm,
    setNewWidgetCaption,
    setNewWidgetPath,
    setWidgets,
  }) => {
    const versionOptions = createVersionOptions(versions);
    const displayedApps = getPaginatedSlice(
      ITEMS_PER_PAGE,
      currentPage,
      filteredApps,
    );
    const packageManagers = ["npm", "yarn", "pnpm", "bun"];

    return (
      <div className="widget-manager">
        {/* Apps List Section */}
        <div className="list-container">
          <Dropdown
            value={versionFilter}
            onChange={setVersionFilter}
            options={versionOptions}
          />
          <SearchBox
            placeholder="Search Mendix apps..."
            value={appSearchTerm}
            onChange={setAppSearchTerm}
          />
          <div className="list-area">
            {R.ifElse(
              R.isEmpty,
              () => renderEmptyState("🍓", "No Mendix apps found"),
              R.pipe(
                R.map(renderAppItem(selectedApps, handleAppClick)),
                R.tap(() =>
                  R.when(
                    () => hasMore && !R.isEmpty(displayedApps),
                    () => renderLoadMore(() => setCurrentPage(R.inc)),
                  )(),
                ),
              ),
            )(displayedApps)}
          </div>
        </div>

        {/* Package Manager Controls */}
        <div
          style={{
            padding: "20px",
            borderTop: "1px solid rgba(255, 182, 193, 0.2)",
            borderBottom: "1px solid rgba(255, 182, 193, 0.2)",
            background: "rgba(255, 235, 240, 0.02)",
          }}
        >
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "10px",
                fontSize: "14px",
                color: "rgba(255, 182, 193, 0.9)",
              }}
            >
              Package Manager:
            </label>
            <div style={{ display: "flex", gap: "15px" }}>
              {R.map(
                renderPackageManagerOption(packageManager, setPackageManager),
                packageManagers,
              )}
            </div>
          </div>

          <button
            className="install-button"
            onClick={handleInstall}
            disabled={isInstalling || R.equals(0, selectedWidgets.size)}
            style={{
              width: "100%",
              marginBottom: "10px",
              opacity: getButtonOpacity(selectedWidgets.size > 0),
            }}
          >
            <span className="button-icon">{isInstalling ? "⏳" : "📦"}</span>
            {isInstalling
              ? "Installing..."
              : `Install (${selectedWidgets.size} widgets)`}
          </button>

          <button
            className="install-button"
            onClick={handleBuildDeploy}
            disabled={
              isBuilding ||
              R.equals(0, selectedWidgets.size) ||
              R.equals(0, selectedApps.size)
            }
            style={{
              width: "100%",
              background:
                "linear-gradient(135deg, rgba(46, 204, 113, 0.3) 0%, rgba(46, 204, 113, 0.5) 100%)",
              borderColor: "rgba(46, 204, 113, 0.6)",
              opacity: getButtonOpacity(
                selectedWidgets.size > 0 && selectedApps.size > 0,
              ),
            }}
          >
            <span className="button-icon">{isBuilding ? "⏳" : "🚀"}</span>
            {isBuilding
              ? "Building & Deploying..."
              : `Build + Deploy (${selectedWidgets.size} widgets → ${selectedApps.size} apps)`}
          </button>
        </div>

        {/* Widgets List Section */}
        <div className="list-container">
          <SearchBox
            placeholder="Search widgets by caption..."
            value={widgetSearchTerm}
            onChange={setWidgetSearchTerm}
          />
          <div className="list-area">
            {/* Add Widget Button */}
            <div
              className="version-list-item"
              onClick={() => {
                R.pipe(
                  R.tap(() => setShowWidgetModal(true)),
                  R.tap(() => setShowAddWidgetForm(false)),
                  R.tap(() => setNewWidgetCaption("")),
                  R.tap(() => setNewWidgetPath("")),
                )();
              }}
              style={{
                cursor: "pointer",
                backgroundColor: "rgba(255, 182, 193, 0.1)",
              }}
            >
              <div className="version-info">
                <span className="version-icon">➕</span>
                <div className="version-details">
                  <span className="version-number">Add New Widget</span>
                  <span className="version-date">Click to add a widget</span>
                </div>
              </div>
            </div>

            {/* Widget List */}
            {R.cond([
              [
                () => R.isEmpty(filteredWidgets) && R.isEmpty(widgetSearchTerm),
                () => renderEmptyState("🧩", "No widgets registered"),
              ],
              [
                () =>
                  R.isEmpty(filteredWidgets) && !R.isEmpty(widgetSearchTerm),
                () =>
                  renderEmptyState(
                    "🔍",
                    `No widgets found matching "${widgetSearchTerm}"`,
                  ),
              ],
              [
                R.T,
                () =>
                  R.map(
                    renderWidgetItem(
                      selectedWidgets,
                      setSelectedWidgets,
                      setWidgets,
                    ),
                    filteredWidgets,
                  ),
              ],
            ])()}
          </div>
        </div>
      </div>
    );
  },
);

WidgetManager.displayName = "WidgetManager";

export default WidgetManager;
