import * as R from "ramda";
import { memo, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import SearchBox from "../common/SearchBox";
import DynamicPropertyInput from "../common/DynamicPropertyInput";
import {
  parseWidgetProperties,
  initializePropertyValues,
  createPropertyChangeHandler,
  groupPropertiesByCategory,
} from "../../utils/functional";
import WidgetRenderer from "./WidgetRenderer";
import "./WidgetRenderer.css";

// ============= Helper Functions =============

// Widget content loading functions
const loadWidgetContents = R.curry(async (widgetPath) => {
  try {
    const contents = await invoke("extract_widget_contents", { widgetPath });
    return contents;
  } catch (error) {
    console.error("❌ Failed to load widget contents:", error);
    throw new Error(
      `Failed to load widget contents: ${error.message || error}`,
    );
  }
});

const loadWidgetPreviewData = R.curry(async (widgetPath) => {
  try {
    const previewData = await invoke("get_widget_preview_data", { widgetPath });
    return previewData;
  } catch (error) {
    console.error("❌ Failed to load widget preview data:", error);
    throw new Error(
      `Failed to load widget preview data: ${error.message || error}`,
    );
  }
});

// Loading state helpers
const createLoadingState = R.curry((isLoading, message) => ({
  isLoading,
  message,
  timestamp: new Date().toISOString(),
}));

const isLoadingState = R.propEq(true, "isLoading");
const getLoadingMessage = R.propOr("Loading...", "message");

// Check if widget is selected for preview
const isWidgetSelectedForPreview = R.curry((selectedWidgetForPreview, widget) =>
  R.equals(selectedWidgetForPreview, R.prop("id", widget)),
);

// Create widget class name
const getWidgetClassName = R.curry((selectedWidgetForPreview, widget) =>
  R.join(" ", [
    "version-list-item",
    isWidgetSelectedForPreview(selectedWidgetForPreview, widget)
      ? "selected"
      : "",
  ]),
);

// Render empty state
const renderEmptyState = R.curry((icon, message) => (
  <div className="loading-indicator">
    <span className="loading-icon">{icon}</span>
    <span>{message}</span>
  </div>
));

// Render widget item for preview (single selection)
// Render actual widget preview using preview data
const renderWidgetPreview = R.curry((previewData, properties) => {
  if (!previewData) {
    return (
      <div className="mock-widget">
        <div className="widget-frame">
          <div className="widget-title">🎭 Widget Preview</div>
          <div className="widget-content">
            <p>Loading widget preview...</p>
          </div>
        </div>
      </div>
    );
  }

  const componentName = previewData.component_name || "Unknown Widget";
  const componentType = previewData.component_type || "unknown";
  const hasReact = previewData.has_react;
  const hasDom = previewData.has_dom_manipulation;
  const cssClasses = previewData.css_classes || [];
  const props = previewData.props || [];

  return (
    <div className="mock-widget">
      <div className="widget-frame">
        <div className="widget-title">
          🎭 {componentName}
          <span className="widget-type-badge">{componentType}</span>
        </div>
        <div className="widget-content">
          <div className="widget-preview-info">
            <div className="preview-badges">
              {hasReact && <span className="tech-badge react">⚛️ React</span>}
              {hasDom && <span className="tech-badge dom">🌐 DOM</span>}
            </div>

            <div className="preview-details">
              <div className="detail-section">
                <h4>📋 Properties ({props.length})</h4>
                <div className="props-list">
                  {props.length > 0 ? (
                    props.slice(0, 5).map((prop, index) => (
                      <span key={index} className="prop-tag">
                        {prop}
                      </span>
                    ))
                  ) : (
                    <span className="no-props">No properties detected</span>
                  )}
                  {props.length > 5 && (
                    <span className="prop-tag more">
                      +{props.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h4>🎨 CSS Classes ({cssClasses.length})</h4>
                <div className="css-classes-list">
                  {cssClasses.length > 0 ? (
                    cssClasses.slice(0, 5).map((className, index) => (
                      <span key={index} className="css-class-tag">
                        {className}
                      </span>
                    ))
                  ) : (
                    <span className="no-classes">No CSS classes detected</span>
                  )}
                  {cssClasses.length > 5 && (
                    <span className="css-class-tag more">
                      +{cssClasses.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const renderWidgetItem = R.curry(
  (
    selectedWidgetForPreview,
    setSelectedWidgetForPreview,
    setWidgets,
    widget,
  ) => (
    <div
      key={R.prop("id", widget)}
      className={getWidgetClassName(selectedWidgetForPreview, widget)}
      onClick={R.pipe(
        R.tap((e) => {
          e.preventDefault();
          e.stopPropagation();
        }),
        R.always(R.prop("id", widget)),
        (widgetId) => {
          // Single selection logic - toggle if same widget, select if different
          const newSelection = R.equals(selectedWidgetForPreview, widgetId)
            ? null
            : widgetId;
          setSelectedWidgetForPreview(newSelection);
        },
      )}
      style={{ cursor: "pointer" }}
    >
      <div className="version-info">
        <div className="version-details">
          <span className="version-number">{R.prop("caption", widget)}</span>
        </div>
      </div>
      <button
        className="uninstall-button"
        onClick={R.pipe(
          R.tap((e) => {
            e.preventDefault();
            e.stopPropagation();
          }),
          R.always(R.prop("id", widget)),
          R.tap((widgetId) => {
            setWidgets((prevWidgets) => {
              const newWidgets = R.filter(
                R.pipe(R.prop("id"), R.complement(R.equals(widgetId))),
                prevWidgets,
              );
              localStorage.setItem(
                "kirakiraWidgets",
                JSON.stringify(newWidgets),
              );
              return newWidgets;
            });
          }),
          R.tap((widgetId) => {
            setSelectedWidgets((prevSelected) => {
              const newSet = new Set(prevSelected);
              newSet.delete(widgetId);
              localStorage.setItem(
                "kirakiraSelectedWidgets",
                JSON.stringify(Array.from(newSet)),
              );
              return newSet;
            });
          }),
          R.always(undefined),
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

// Render dynamic properties section
const renderDynamicPropertiesSection = R.curry(
  (selectedWidget, widgetDefinition, properties, updateProperty) => (
    <div className="property-section">
      {R.ifElse(
        R.identity,
        (widget) => (
          <>
            {R.ifElse(
              R.identity,
              (definition) => {
                const parsedProperties = parseWidgetProperties(definition);
                const groupedProperties =
                  groupPropertiesByCategory(parsedProperties);

                return R.map(
                  (group) => (
                    <div
                      key={R.prop("category", group)}
                      className="property-group"
                    >
                      <h5 className="property-group-title">
                        📋 {R.prop("category", group)}
                      </h5>
                      {R.map(
                        (property) => (
                          <DynamicPropertyInput
                            key={R.prop("key", property)}
                            property={property}
                            value={R.prop(R.prop("key", property), properties)}
                            onChange={createPropertyChangeHandler(
                              R.prop("key", property),
                              updateProperty,
                            )}
                            disabled={false}
                            showValidation={true}
                          />
                        ),
                        R.prop("properties", group),
                      )}
                    </div>
                  ),
                  groupedProperties,
                );
              },
              () => (
                <div className="property-loading">
                  <span className="loading-icon">⏳</span>
                  <p>Loading widget properties...</p>
                </div>
              ),
            )(widgetDefinition)}
          </>
        ),
        () => (
          <div className="no-widget-selected">
            <span className="no-widget-icon">🧩</span>
            <p>Select a widget to view its properties</p>
          </div>
        ),
      )(selectedWidget)}
    </div>
  ),
);

// Render preview content based on selected widget
const renderPreviewContent = R.curryN(3, (widgetData, uiState, handlers) =>
  R.ifElse(
    R.path(["widget"]),
    (data) => (
      <div className="widget-preview-content">
        {R.cond([
          [
            () => isLoadingState(uiState.loadingState),
            () => (
              <div className="loading-indicator">
                <span className="loading-icon">⏳</span>
                <span>{getLoadingMessage(uiState.loadingState)}</span>
              </div>
            ),
          ],
          [
            () => !R.isNil(handlers.errorState),
            () => (
              <div className="error-state">
                <span className="error-icon">❌</span>
                <h4>Failed to load widget contents</h4>
                <p className="error-message">
                  {R.propOr("Unknown error", "message", handlers.errorState)}
                </p>
                <div className="error-actions">
                  <button
                    className="retry-button"
                    onClick={handlers.handleRetry}
                  >
                    <span className="button-icon">🔄</span>
                    Retry
                  </button>
                  <button
                    className="clear-error-button"
                    onClick={handlers.handleClearError}
                  >
                    <span className="button-icon">✨</span>
                    Clear
                  </button>
                </div>
              </div>
            ),
          ],
          [
            () => R.isNil(widgetData.contents),
            () => (
              <div className="no-content">
                <span className="berry-icon">🍓</span>
                <p>Click to load widget contents</p>
              </div>
            ),
          ],
          [
            () => uiState.activeTab === "preview",
            () => (
              <WidgetRenderer
                widgetContents={widgetData.contents}
                widgetPreviewData={widgetData.previewData}
                properties={uiState.properties}
                selectedWidget={widgetData.widget}
                onError={(error) => {
                  console.error("Widget rendering error:", error);
                  handlers.setErrorState({
                    message: `Rendering failed: ${error.message}`,
                    widgetPath: widgetData.widget?.path,
                    timestamp: new Date().toISOString(),
                  });
                }}
              />
            ),
          ],
          [
            R.T,
            () =>
              renderWidgetPreview(widgetData.previewData, uiState.properties),
          ],
        ])()}
      </div>
    ),
    () => (
      <div className="preview-placeholder">
        <span className="berry-icon">🍓</span>
        <p>Select a widget to preview</p>
        <div className="sparkle-animation">✨ ✨ ✨</div>
      </div>
    ),
  )(widgetData),
);

// Render widget list area
const renderWidgetListArea = R.curryN(
  3,
  (widgetData, widgetHandlers, modalHandlers) => (
    <div className="list-area">
      {/* Add Widget Button */}
      <div
        className="version-list-item"
        onClick={R.pipe(
          R.tap(() => modalHandlers.setShowWidgetModal(true)),
          R.tap(() => modalHandlers.setShowAddWidgetForm(false)),
          R.tap(() => modalHandlers.setNewWidgetCaption("")),
          R.tap(() => modalHandlers.setNewWidgetPath("")),
          R.always(undefined),
        )}
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
          () =>
            R.isEmpty(widgetData.filteredWidgets) &&
            R.isEmpty(widgetData.widgetSearchTerm),
          () => renderEmptyState("🧩", "No widgets registered"),
        ],
        [
          () =>
            R.isEmpty(widgetData.filteredWidgets) &&
            !R.isEmpty(widgetData.widgetSearchTerm),
          () =>
            renderEmptyState(
              "🔍",
              `No widgets found matching "${widgetData.widgetSearchTerm}"`,
            ),
        ],
        [
          R.T,
          () =>
            R.map(
              renderWidgetItem(
                widgetData.selectedWidgetForPreview,
                widgetHandlers.setSelectedWidgetForPreview,
                widgetHandlers.setWidgets,
              ),
              widgetData.filteredWidgets,
            ),
        ],
      ])()}
    </div>
  ),
);

// ============= Main Component =============

const WidgetPreview = memo(
  ({
    widgetPreviewSearch,
    setWidgetPreviewSearch,
    properties,
    updateProperty,
    widgets,
    filteredWidgets,
    widgetSearchTerm,
    setWidgetSearchTerm,
    selectedWidgetForPreview,
    setSelectedWidgetForPreview,
    setWidgets,
    setShowWidgetModal,
    setShowAddWidgetForm,
    setNewWidgetCaption,
    setNewWidgetPath,
  }) => {
    // State for widget definition and dynamic properties
    const [widgetDefinition, setWidgetDefinition] = useState(null);
    const [dynamicProperties, setDynamicProperties] = useState({});

    // State for widget contents
    const [widgetContents, setWidgetContents] = useState(null);
    const [widgetPreviewData, setWidgetPreviewData] = useState(null);
    const [loadingState, setLoadingState] = useState(
      createLoadingState(false, ""),
    );
    const [selectedFile, setSelectedFile] = useState(null);
    const [errorState, setErrorState] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [activeTab, setActiveTab] = useState("preview");

    // Get selected widget (convert to string for comparison)
    const selectedWidget = R.pipe(
      R.find(R.propEq(String(selectedWidgetForPreview), "id")),
      R.defaultTo(null),
    )(widgets);

    // Load widget definition when widget is selected
    useEffect(() => {
      if (selectedWidget) {
        invoke("parse_widget_properties", {
          widgetPath: R.prop("path", selectedWidget),
        })
          .then((definition) => {
            setWidgetDefinition(definition);
            // Initialize dynamic properties with default values
            const initialProperties = initializePropertyValues(definition);
            setDynamicProperties(initialProperties);
          })
          .catch((error) => {
            console.error("Failed to parse widget properties:", error);
            setWidgetDefinition(null);
            setDynamicProperties({});
          });
      } else {
        setWidgetDefinition(null);
        setDynamicProperties({});
      }
    }, [selectedWidget]);

    // Load widget contents when widget is selected
    useEffect(() => {
      if (selectedWidget) {
        setLoadingState(createLoadingState(true, "Loading widget contents..."));
        setWidgetContents(null);
        setWidgetPreviewData(null);
        setSelectedFile(null);
        setErrorState(null);

        Promise.all([
          loadWidgetContents(R.prop("path", selectedWidget)),
          loadWidgetPreviewData(R.prop("path", selectedWidget)),
        ])
          .then(([contents, previewData]) => {
            setWidgetContents(contents);
            setWidgetPreviewData(previewData);
            setLoadingState(createLoadingState(false, ""));
            setErrorState(null);
            setRetryCount(0);
          })
          .catch((error) => {
            console.error("❌ Failed to load widget data:", error);
            setErrorState({
              message: error.toString(),
              widgetPath: R.prop("path", selectedWidget),
              timestamp: new Date().toISOString(),
            });
            setLoadingState(createLoadingState(false, ""));
          });
      } else {
        setWidgetContents(null);
        setWidgetPreviewData(null);
        setSelectedFile(null);
        setErrorState(null);
        setLoadingState(createLoadingState(false, ""));
      }
    }, [selectedWidget, retryCount]);

    // Create property update handler for dynamic properties
    const updateDynamicProperty = R.curry((propertyKey, value) => {
      setDynamicProperties(R.assoc(propertyKey, value));
    });

    // File selection handler
    const handleFileSelect = R.curry((filePath) => {
      setSelectedFile(filePath);
    });

    // Error retry handler
    const handleRetry = R.curry(() => {
      setRetryCount(R.inc);
    });

    // Error clear handler
    const handleClearError = R.curry(() => {
      setErrorState(null);
    });

    // Enhanced error handling for widget renderer
    const enhancedErrorHandling = {
      errorState,
      handleRetry,
      handleClearError,
      setErrorState,
    };

    // Combine static and dynamic properties for preview
    const combinedProperties = R.mergeRight(properties, dynamicProperties);

    return (
      <div className="widget-preview">
        {/* Left Panel - Widget List */}
        <div className="preview-left">
          <SearchBox
            placeholder="Search widgets by caption..."
            value={widgetSearchTerm}
            onChange={setWidgetSearchTerm}
          />
          {renderWidgetListArea(
            {
              filteredWidgets,
              widgetSearchTerm,
              selectedWidgetForPreview,
            },
            {
              setSelectedWidgetForPreview,
              setWidgets,
            },
            {
              setShowWidgetModal,
              setShowAddWidgetForm,
              setNewWidgetCaption,
              setNewWidgetPath,
            },
          )}
        </div>

        {/* Middle Panel - Properties */}
        <div className="preview-middle">
          <h3>🍓 Properties</h3>
          {renderDynamicPropertiesSection(
            selectedWidget,
            widgetDefinition,
            combinedProperties,
            updateDynamicProperty,
          )}
        </div>

        {/* Right Panel - Widget Preview */}
        <div className="preview-right">
          <h3>✨ Widget Preview</h3>
          {renderPreviewContent(
            {
              widget: selectedWidget,
              definition: widgetDefinition,
              contents: widgetContents,
              previewData: widgetPreviewData,
            },
            {
              properties: combinedProperties,
              loadingState: loadingState,
              selectedFile: selectedFile,
              activeTab: activeTab,
            },
            {
              onFileSelect: handleFileSelect,
              setActiveTab: setActiveTab,
              errorState: enhancedErrorHandling.errorState,
              handleRetry: enhancedErrorHandling.handleRetry,
              handleClearError: enhancedErrorHandling.handleClearError,
              setErrorState: enhancedErrorHandling.setErrorState,
            },
          )}
        </div>
      </div>
    );
  },
);

WidgetPreview.displayName = "WidgetPreview";

export default WidgetPreview;
