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

// ============= Helper Functions =============

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
const renderPreviewContent = R.curry(
  (selectedWidget, properties, widgetDefinition) =>
    R.ifElse(
      R.identity,
      (widget) => (
        <div className="widget-preview-content">
          <div className="widget-frame">
            <div className="widget-title">{R.prop("caption", widget)}</div>
            {/* <div className="widget-content">
              {R.ifElse(
                R.identity,
                (definition) => {
                  const parsedProperties = parseWidgetProperties(definition);
                  return R.map(
                    (property) => (
                      <p key={R.prop("key", property)}>
                        {R.prop("caption", property)}:{" "}
                        {R.propOr(
                          "Not set",
                          R.prop("key", property),
                          properties,
                        )}
                      </p>
                    ),
                    R.take(6, parsedProperties), // Show first 6 properties
                  );
                },
                () => <p>Loading widget properties...</p>,
              )(widgetDefinition)}
            </div> */}
          </div>
        </div>
      ),
      () => (
        <div className="preview-placeholder">
          <span className="berry-icon">🍓</span>
          <p>Select a widget to preview</p>
          <div className="sparkle-animation">✨ ✨ ✨</div>
        </div>
      ),
    )(selectedWidget),
);

// Render widget list area
const renderWidgetListArea = R.curry(
  (
    filteredWidgets,
    widgetSearchTerm,
    selectedWidgetForPreview,
    setSelectedWidgetForPreview,
    setWidgets,
    setShowWidgetModal,
    setShowAddWidgetForm,
    setNewWidgetCaption,
    setNewWidgetPath,
  ) => (
    <div className="list-area">
      {/* Add Widget Button */}
      <div
        className="version-list-item"
        onClick={R.pipe(
          R.tap(() => setShowWidgetModal(true)),
          R.tap(() => setShowAddWidgetForm(false)),
          R.tap(() => setNewWidgetCaption("")),
          R.tap(() => setNewWidgetPath("")),
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
          () => R.isEmpty(filteredWidgets) && R.isEmpty(widgetSearchTerm),
          () => renderEmptyState("🧩", "No widgets registered"),
        ],
        [
          () => R.isEmpty(filteredWidgets) && !R.isEmpty(widgetSearchTerm),
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
                selectedWidgetForPreview,
                setSelectedWidgetForPreview,
                setWidgets,
              ),
              filteredWidgets,
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
    const [isLoadingDefinition, setIsLoadingDefinition] = useState(false);
    const [dynamicProperties, setDynamicProperties] = useState({});

    // Get selected widget (convert to string for comparison)
    const selectedWidget = R.pipe(
      R.find(R.propEq(String(selectedWidgetForPreview), "id")),
      R.defaultTo(null),
    )(widgets);

    // Load widget definition when widget is selected
    useEffect(() => {
      if (selectedWidget) {
        setIsLoadingDefinition(true);
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
          })
          .finally(() => {
            setIsLoadingDefinition(false);
          });
      } else {
        setWidgetDefinition(null);
        setDynamicProperties({});
      }
    }, [selectedWidget]);

    // Create property update handler for dynamic properties
    const updateDynamicProperty = R.curry((propertyKey, value) => {
      setDynamicProperties(R.assoc(propertyKey, value));
    });

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
            filteredWidgets,
            widgetSearchTerm,
            selectedWidgetForPreview,
            setSelectedWidgetForPreview,
            setWidgets,
            setShowWidgetModal,
            setShowAddWidgetForm,
            setNewWidgetCaption,
            setNewWidgetPath,
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
          <div className="widget-content">
            {renderPreviewContent(
              selectedWidget,
              combinedProperties,
              widgetDefinition,
            )}
          </div>
        </div>
      </div>
    );
  },
);

WidgetPreview.displayName = "WidgetPreview";

export default WidgetPreview;
