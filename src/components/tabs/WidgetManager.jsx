import Dropdown from "../common/Dropdown";
import SearchBox from "../common/SearchBox";

const WidgetManager = ({
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
  // Create version filter options
  const versionOptions = [
    { value: "all", label: "🍓 All Versions" },
    ...versions.map((v) => ({
      value: v.version,
      label: `📦 ${v.version}`,
    })),
  ];

  // Get displayed apps (paginated)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayedApps = filteredApps.slice(startIndex, endIndex);

  return (
    <div className="widget-manager">
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
          {displayedApps.map((app) => (
            <div
              key={app.path}
              className={`version-list-item ${selectedApps.has(app.path) ? "selected" : ""}`}
              onClick={() => handleAppClick(app)}
              style={{ cursor: "pointer" }}
            >
              <div className="version-info">
                <span className="version-icon">
                  {selectedApps.has(app.path) ? "☑️" : "📁"}
                </span>
                <div className="version-details">
                  <span className="version-number">
                    {app.name}
                    {app.version && (
                      <span className="version-badge mts">
                        v{app.version}
                      </span>
                    )}
                  </span>
                  <span className="version-date">
                    {app.last_modified
                      ? new Date(app.last_modified).toLocaleDateString()
                      : "Date unknown"}
                  </span>
                </div>
              </div>
              <div className="app-actions">
                <span className="item-sparkle">✨</span>
              </div>
            </div>
          ))}
          {filteredApps.length === 0 && (
            <div className="loading-indicator">
              <span className="loading-icon">🍓</span>
              <span>No Mendix apps found</span>
            </div>
          )}
          {hasMore && displayedApps.length > 0 && (
            <div
              className="end-indicator"
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <span>Load more apps...</span>
            </div>
          )}
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
            {["npm", "yarn", "pnpm", "bun"].map((pm) => (
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
                  checked={packageManager === pm}
                  onChange={(e) => setPackageManager(e.target.value)}
                  style={{ marginRight: "5px" }}
                />
                {pm}
              </label>
            ))}
          </div>
        </div>

        <button
          className="install-button"
          onClick={handleInstall}
          disabled={isInstalling || selectedWidgets.size === 0}
          style={{
            width: "100%",
            marginBottom: "10px",
            opacity: selectedWidgets.size === 0 ? 0.5 : 1,
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
            selectedWidgets.size === 0 ||
            selectedApps.size === 0
          }
          style={{
            width: "100%",
            background:
              "linear-gradient(135deg, rgba(46, 204, 113, 0.3) 0%, rgba(46, 204, 113, 0.5) 100%)",
            borderColor: "rgba(46, 204, 113, 0.6)",
            opacity:
              selectedWidgets.size === 0 || selectedApps.size === 0 ? 0.5 : 1,
          }}
        >
          <span className="button-icon">{isBuilding ? "⏳" : "🚀"}</span>
          {isBuilding
            ? "Building & Deploying..."
            : `Build + Deploy (${selectedWidgets.size} widgets → ${selectedApps.size} apps)`}
        </button>
      </div>

      <div className="list-container">
        <SearchBox
          placeholder="Search widgets by caption..."
          value={widgetSearchTerm}
          onChange={setWidgetSearchTerm}
        />
        <div className="list-area">
          {/* Add Widget Button - Always First Row */}
          <div
            className="version-list-item"
            onClick={() => {
              setShowWidgetModal(true);
              setShowAddWidgetForm(false);
              setNewWidgetCaption("");
              setNewWidgetPath("");
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
          {filteredWidgets.map((widget) => (
            <div
              key={widget.id}
              className={`version-list-item ${selectedWidgets.has(widget.id) ? "selected" : ""}`}
              onClick={() => {
                setSelectedWidgets((prev) => {
                  const newSet = new Set(prev);
                  if (newSet.has(widget.id)) {
                    newSet.delete(widget.id);
                    console.log(
                      `Deselected widget: ${widget.caption} (${widget.id})`,
                    );
                  } else {
                    newSet.add(widget.id);
                    console.log(
                      `Selected widget: ${widget.caption} (${widget.id})`,
                    );
                  }

                  // Save to localStorage immediately
                  const selectedWidgetsArray = Array.from(newSet);
                  console.log(
                    "Saving selected widgets to localStorage:",
                    selectedWidgetsArray,
                  );
                  localStorage.setItem(
                    "kirakiraSelectedWidgets",
                    JSON.stringify(selectedWidgetsArray),
                  );

                  return newSet;
                });
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="version-info">
                <span className="version-icon">
                  {selectedWidgets.has(widget.id) ? "☑️" : "🧩"}
                </span>
                <div className="version-details">
                  <span className="version-number">{widget.caption}</span>
                  <span className="version-date">{widget.path}</span>
                </div>
              </div>
              <button
                className="uninstall-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setWidgets((prev) => {
                    const newWidgets = prev.filter((w) => w.id !== widget.id);
                    localStorage.setItem(
                      "kirakiraWidgets",
                      JSON.stringify(newWidgets),
                    );
                    return newWidgets;
                  });
                  setSelectedWidgets((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(widget.id);

                    // Save to localStorage immediately
                    const newSelectedArray = Array.from(newSet);
                    console.log(
                      "Updating selected widgets after delete:",
                      newSelectedArray,
                    );
                    localStorage.setItem(
                      "kirakiraSelectedWidgets",
                      JSON.stringify(newSelectedArray),
                    );

                    return newSet;
                  });
                }}
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
          ))}

          {filteredWidgets.length === 0 && widgetSearchTerm === "" && (
            <div className="loading-indicator">
              <span className="loading-icon">🧩</span>
              <span>No widgets registered</span>
            </div>
          )}
          {filteredWidgets.length === 0 && widgetSearchTerm !== "" && (
            <div className="loading-indicator">
              <span className="loading-icon">🔍</span>
              <span>No widgets found matching "{widgetSearchTerm}"</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WidgetManager;
