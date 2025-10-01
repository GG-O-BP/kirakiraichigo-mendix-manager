import * as R from "ramda";
import { memo, useEffect } from "react";
import Dropdown from "../common/Dropdown";
import SearchBox from "../common/SearchBox";
import { useDragAndDrop } from "@formkit/drag-and-drop/react";

// ============= Constants =============

const PACKAGE_MANAGERS = ["npm", "yarn", "pnpm", "bun"];

// ============= Data Processing Functions =============

const createVersionOptions = R.pipe(
  R.map(
    R.pipe(R.prop("version"), (version) => ({
      value: version,
      label: `📦 ${version}`,
    })),
  ),
  R.prepend({ value: "all", label: "📦 All Versions" }),
);

const formatDate = R.pipe(
  R.prop("last_modified"),
  R.ifElse(
    R.identity,
    (date) => new Date(date).toLocaleDateString(),
    R.always("Date unknown"),
  ),
);

// ============= Selection State Functions =============

const isAppSelected = R.curry((selectedApps, app) =>
  selectedApps.has(R.prop("path", app)),
);

const isWidgetSelected = R.curry((selectedWidgets, widget) =>
  selectedWidgets.has(R.prop("id", widget)),
);

const getAppClassName = R.curry((selectedApps, app) =>
  R.join(" ", [
    "version-list-item",
    "widget-item-clickable",
    isAppSelected(selectedApps, app) ? "selected" : "",
  ]),
);

const getWidgetClassName = R.curry((selectedWidgets, widget) =>
  R.join(" ", [
    "version-list-item",
    "widget-item-clickable",
    isWidgetSelected(selectedWidgets, widget) ? "selected" : "",
  ]),
);

// ============= Button State Functions =============

const isInstallButtonDisabled = R.curry((isInstalling, selectedWidgets) =>
  R.or(isInstalling, R.equals(0, selectedWidgets.size)),
);

const isBuildDeployButtonDisabled = R.curry(
  (isBuilding, selectedWidgets, selectedApps) =>
    R.or(
      R.or(isBuilding, R.equals(0, selectedWidgets.size)),
      R.equals(0, selectedApps.size),
    ),
);

// ============= Event Handlers =============

const createAppClickHandler = R.curry((handleAppClick, app, e) =>
  R.pipe(
    R.tap(() => e.preventDefault()),
    R.tap(() => e.stopPropagation()),
    R.always(app),
    handleAppClick,
  )(),
);

const createWidgetSelectionHandler = R.curry(
  (setSelectedWidgets, widgetId, e) =>
    R.pipe(
      R.tap(() => e.preventDefault()),
      R.tap(() => e.stopPropagation()),
      R.always(widgetId),
      (id) => {
        setSelectedWidgets((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }

          try {
            localStorage.setItem(
              "kirakiraSelectedWidgets",
              JSON.stringify(Array.from(newSet)),
            );
          } catch (error) {
            // Handle error silently
          }

          return newSet;
        });
      },
    )(),
);

const createWidgetDeleteHandler = R.curry(
  (handleWidgetDeleteClick, widget, e) =>
    R.pipe(
      R.tap(() => e.preventDefault()),
      R.tap(() => e.stopPropagation()),
      R.always(widget),
      handleWidgetDeleteClick,
    )(),
);

const createAddWidgetHandler = R.curry(
  (
    setShowWidgetModal,
    setShowAddWidgetForm,
    setNewWidgetCaption,
    setNewWidgetPath,
  ) =>
    R.pipe(
      R.tap(() => setShowWidgetModal(true)),
      R.tap(() => setShowAddWidgetForm(false)),
      R.tap(() => setNewWidgetCaption("")),
      R.tap(() => setNewWidgetPath("")),
    )(),
);

// ============= Search Controls =============

const renderSearchControls = R.curry((config) => (
  <div className="search-controls">
    {config.dropdown && (
      <Dropdown
        value={config.dropdown.value}
        onChange={config.dropdown.onChange}
        options={config.dropdown.options}
      />
    )}
    <div className="search-row">
      <SearchBox
        placeholder={config.placeholder}
        value={config.searchTerm}
        onChange={config.setSearchTerm}
      />
    </div>
  </div>
));

const renderPanel = R.curry((config) => (
  <div key={config.key} className={config.className}>
    {config.searchControls}
    <div className="list-area">{config.content}</div>
  </div>
));

// ============= Render Functions =============

const renderEmptyState = R.curry((icon, message) => (
  <div className="loading-indicator">
    <span className="loading-icon">{icon}</span>
    <span>{message}</span>
  </div>
));

const renderAppIcon = R.curry((selectedApps, app) =>
  isAppSelected(selectedApps, app) ? "☑️" : "📁",
);

const renderWidgetIcon = R.curry((selectedWidgets, widget) =>
  isWidgetSelected(selectedWidgets, widget) ? "☑️" : "🧩",
);

const renderVersionBadge = R.ifElse(
  R.prop("version"),
  (app) => (
    <span className="version-badge app-version">v{R.prop("version", app)}</span>
  ),
  R.always(null),
);

const renderPackageManagerOption = R.curry(
  (packageManager, setPackageManager, pm) => (
    <label key={pm} className="checkbox-label">
      <input
        type="radio"
        name="packageManager"
        value={pm}
        checked={R.equals(packageManager, pm)}
        onChange={R.pipe(R.path(["target", "value"]), setPackageManager)}
        className="checkbox-input"
      />
      <span className="checkbox-text">{pm}</span>
    </label>
  ),
);

// ============= List Item Renderers =============

const renderAppListItem = R.curry((selectedApps, handleAppClick, app) => (
  <div
    key={R.prop("path", app)}
    className={getAppClassName(selectedApps, app)}
    onClick={createAppClickHandler(handleAppClick, app)}
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

const renderWidgetListItem = R.curry(
  (selectedWidgets, setSelectedWidgets, handleWidgetDeleteClick, widget) => (
    <div
      key={R.prop("id", widget)}
      data-label={R.prop("id", widget)}
      className={getWidgetClassName(selectedWidgets, widget)}
      onClick={createWidgetSelectionHandler(
        setSelectedWidgets,
        R.prop("id", widget),
      )}
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
        className="install-button uninstall-button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={createWidgetDeleteHandler(handleWidgetDeleteClick, widget)}
      >
        <span className="button-icon">🗑️</span>
      </button>
    </div>
  ),
);

const renderAddWidgetItem = R.curry(
  (
    setShowWidgetModal,
    setShowAddWidgetForm,
    setNewWidgetCaption,
    setNewWidgetPath,
  ) => (
    <div
      className="version-list-item add-widget-item"
      onClick={createAddWidgetHandler(
        setShowWidgetModal,
        setShowAddWidgetForm,
        setNewWidgetCaption,
        setNewWidgetPath,
      )}
    >
      <div className="version-info">
        <span className="version-icon">➕</span>
        <div className="version-details">
          <span className="version-number">Add New Widget</span>
          <span className="version-date">Click to add a widget</span>
        </div>
      </div>
    </div>
  ),
);

// ============= Results Renderers =============

const renderSuccessfulWidget = R.curry((result, index) => (
  <div key={index} className="inline-result-item success">
    <span className="result-icon">✅</span>
    <span className="result-text">{R.prop("widget", result)}</span>
    <span className="result-details">
      → {R.pipe(R.prop("apps"), R.join(", "))(result)}
    </span>
  </div>
));

const renderFailedWidget = R.curry((result, index) => (
  <div key={index} className="inline-result-item failed">
    <span className="result-icon">❌</span>
    <span className="result-text">{R.prop("widget", result)}</span>
  </div>
));

const renderInlineResults = R.ifElse(
  R.propSatisfies(R.complement(R.isNil), "inlineResults"),
  ({ inlineResults, setInlineResults }) => {
    const successfulResults = R.pipe(
      R.propOr([], "successful"),
      R.addIndex(R.map)(renderSuccessfulWidget),
    )(inlineResults);

    const failedResults = R.pipe(
      R.propOr([], "failed"),
      R.addIndex(R.map)(renderFailedWidget),
    )(inlineResults);

    const hasResults = R.pipe(
      R.juxt([
        R.pipe(R.propOr([], "successful"), R.complement(R.isEmpty)),
        R.pipe(R.propOr([], "failed"), R.complement(R.isEmpty)),
      ]),
      R.any(R.identity),
    )(inlineResults);

    return R.ifElse(
      R.always(hasResults),
      R.always(
        <div className="inline-results-container">
          <div className="inline-results-header">
            <h4>Build & Deploy Results</h4>
            <button
              className="clear-results-button"
              onClick={() => setInlineResults(null)}
            >
              Clear
            </button>
          </div>
          <div className="inline-results-content">
            {successfulResults}
            {failedResults}
          </div>
        </div>,
      ),
      R.always(null),
    )();
  },
  R.always(null),
);

// ============= List Renderers =============

const renderAppsList = R.curry((selectedApps, handleAppClick, apps) =>
  R.ifElse(
    R.isEmpty,
    () => renderEmptyState("🍓", "No Mendix apps found"),
    (apps) => R.map(renderAppListItem(selectedApps, handleAppClick), apps),
  )(apps),
);

const renderWidgetsList = R.curry(
  (
    selectedWidgets,
    setSelectedWidgets,
    handleWidgetDeleteClick,
    filteredWidgets,
    reorderedWidgets,
    widgetSearchTerm,
    modalHandlers,
    widgetListRef,
  ) => {
    // Use filtered widgets when searching, reordered widgets when not searching
    const widgetsToShow = R.isEmpty(widgetSearchTerm)
      ? reorderedWidgets
      : filteredWidgets;
    const shouldEnableDragDrop = R.isEmpty(widgetSearchTerm);

    return R.cond([
      [
        () => R.isEmpty(widgetsToShow) && R.isEmpty(widgetSearchTerm),
        () => (
          <div>
            {renderAddWidgetItem(...modalHandlers)}
            {renderEmptyState("🧩", "No widgets registered")}
          </div>
        ),
      ],
      [
        () => R.isEmpty(widgetsToShow) && !R.isEmpty(widgetSearchTerm),
        () => (
          <div>
            {renderAddWidgetItem(...modalHandlers)}
            {renderEmptyState(
              "🔍",
              `No widgets found matching "${widgetSearchTerm}"`,
            )}
          </div>
        ),
      ],
      [
        R.T,
        () => (
          <div>
            {renderAddWidgetItem(...modalHandlers)}
            {shouldEnableDragDrop ? (
              <div ref={widgetListRef} className="draggable-widget-list">
                {R.map(
                  (widget) =>
                    renderWidgetListItem(
                      selectedWidgets,
                      setSelectedWidgets,
                      handleWidgetDeleteClick,
                      widget,
                    ),
                  widgetsToShow,
                )}
              </div>
            ) : (
              <div className="widget-list">
                {R.map(
                  (widget) =>
                    renderWidgetListItem(
                      selectedWidgets,
                      setSelectedWidgets,
                      handleWidgetDeleteClick,
                      widget,
                    ),
                  widgetsToShow,
                )}
              </div>
            )}
          </div>
        ),
      ],
    ])();
  },
);

// ============= Main Component =============

const WidgetManager = memo(
  ({
    versionFilter,
    setVersionFilter,
    versions,
    appSearchTerm,
    setAppSearchTerm,
    filteredApps,
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
    filteredWidgets,
    widgetSearchTerm,
    setWidgetSearchTerm,
    setShowWidgetModal,
    setShowAddWidgetForm,
    setNewWidgetCaption,
    setNewWidgetPath,
    setWidgets,
    inlineResults,
    setInlineResults,
    handleWidgetDeleteClick,
  }) => {
    const versionOptions = createVersionOptions(versions);
    const modalHandlers = [
      setShowWidgetModal,
      setShowAddWidgetForm,
      setNewWidgetCaption,
      setNewWidgetPath,
    ];

    // Drag and drop functionality for widgets - only enabled when not searching
    const widgetsForDragDrop = R.isEmpty(widgetSearchTerm)
      ? filteredWidgets
      : [];

    const [widgetListRef, reorderedWidgets, setReorderedWidgets] =
      useDragAndDrop(widgetsForDragDrop, {
        onSort: ({ values }) => {
          // Update the main widgets array with new order
          if (R.isEmpty(widgetSearchTerm)) {
            setWidgets(values);
          }
        },
      });

    // Update reordered widgets when filteredWidgets changes
    useEffect(() => {
      setReorderedWidgets(filteredWidgets);
    }, [filteredWidgets, setReorderedWidgets]);

    const panelConfigs = [
      {
        key: "apps",
        className: "list-container",
        searchControls: renderSearchControls({
          placeholder: "Search Mendix apps...",
          searchTerm: appSearchTerm,
          setSearchTerm: setAppSearchTerm,
          dropdown: {
            value: versionFilter,
            onChange: setVersionFilter,
            options: versionOptions,
          },
        }),
        content: renderAppsList(selectedApps, handleAppClick, filteredApps),
      },
      {
        key: "widgets",
        className: "list-container",
        searchControls: renderSearchControls({
          placeholder: "Search widgets by caption...",
          searchTerm: widgetSearchTerm,
          setSearchTerm: setWidgetSearchTerm,
        }),
        content: renderWidgetsList(
          selectedWidgets,
          setSelectedWidgets,
          handleWidgetDeleteClick,
          filteredWidgets,
          reorderedWidgets,
          widgetSearchTerm,
          modalHandlers,
          widgetListRef,
        ),
      },
    ];

    return (
      <div className="base-manager widget-manager">
        {R.map(renderPanel, panelConfigs)}

        {/* Package Manager Controls */}
        <div className="package-manager-section">
          <div className="package-manager-group">
            <label className="package-manager-label">Package Manager:</label>
            <div className="package-manager-filters">
              {R.map(
                renderPackageManagerOption(packageManager, setPackageManager),
                PACKAGE_MANAGERS,
              )}
            </div>
          </div>

          <button
            onClick={handleInstall}
            disabled={isInstallButtonDisabled(isInstalling, selectedWidgets)}
            className={`install-button install-button-full ${
              selectedWidgets.size > 0 ? "button-enabled" : "button-disabled"
            }`}
          >
            <span className="button-icon">{isInstalling ? "⏳" : "📦"}</span>
            {isInstalling
              ? "Installing..."
              : `Install (${selectedWidgets.size} widgets)`}
          </button>

          <button
            onClick={handleBuildDeploy}
            disabled={isBuildDeployButtonDisabled(
              isBuilding,
              selectedWidgets,
              selectedApps,
            )}
            className={`install-button build-deploy-button ${
              selectedWidgets.size > 0 && selectedApps.size > 0
                ? "button-enabled"
                : "button-disabled"
            }`}
          >
            <span className="button-icon">{isBuilding ? "⏳" : "🚀"}</span>
            {isBuilding
              ? "Building & Deploying..."
              : `Build + Deploy (${selectedWidgets.size} widgets → ${selectedApps.size} apps)`}
          </button>

          {/* Inline Results Section */}
          {renderInlineResults({ inlineResults, setInlineResults })}
        </div>
      </div>
    );
  },
);

WidgetManager.displayName = "WidgetManager";

export default WidgetManager;
