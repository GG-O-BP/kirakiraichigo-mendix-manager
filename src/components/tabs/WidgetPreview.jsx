import * as R from "ramda";
import { memo, useEffect, useState, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import SearchBox from "../common/SearchBox";
import DynamicPropertyInput from "../common/DynamicPropertyInput";
import WidgetPreviewFrame from "../common/WidgetPreviewFrame";
import {
  parseWidgetProperties,
  initializePropertyValues,
  createPropertyChangeHandler,
  groupPropertiesByCategory,
} from "../../utils/functional";
import {
  createEditorConfigHandler,
  filterParsedPropertiesByKeys,
} from "../../utils/editorConfigParser";
import { useDragAndDrop } from "@formkit/drag-and-drop/react";

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

// Calculate new selection value (toggle if same, select if different)
const calculateNewSelection = R.curry((currentSelection, widgetId) =>
  R.ifElse(
    R.equals(currentSelection),
    R.always(null),
    R.always(widgetId),
  )(widgetId),
);

// Create widget selection handler
const createWidgetSelectionHandler = R.curry(
  (selectedWidgetForPreview, setSelectedWidgetForPreview, widgetId) =>
    R.pipe(
      calculateNewSelection(selectedWidgetForPreview),
      setSelectedWidgetForPreview,
    )(widgetId),
);

// Create widget delete handler (opens modal)
const createWidgetDeleteHandler = R.curry(
  (handleWidgetDeleteClick, widget, e) =>
    R.pipe(
      R.tap(() => e.preventDefault()),
      R.tap(() => e.stopPropagation()),
      R.always(widget),
      handleWidgetDeleteClick,
    )(),
);

// Render widget item for preview (single selection)
const renderWidgetItem = R.curry(
  (
    selectedWidgetForPreview,
    setSelectedWidgetForPreview,
    handleWidgetDeleteClick,
    widget,
  ) => (
    <div
      key={R.prop("id", widget)}
      data-label={R.prop("id", widget)}
      className={getWidgetClassName(selectedWidgetForPreview, widget)}
      onClick={R.pipe(
        R.always(R.prop("id", widget)),
        createWidgetSelectionHandler(
          selectedWidgetForPreview,
          setSelectedWidgetForPreview,
        ),
      )}
    >
      <div className="version-info">
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

// Render no properties message
const renderNoProperties = R.always(
  <div className="no-properties">
    <span className="info-icon">ℹ️</span>
    <p>No configurable properties found</p>
  </div>,
);

// Render property input for a single property
const renderPropertyInput = R.curry((properties, updateProperty, property) => (
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
));

// Render property group
const renderPropertyGroup = R.curry((properties, updateProperty, group) => (
  <div key={R.prop("category", group)} className="property-group">
    <h5 className="property-group-title">📋 {R.prop("category", group)}</h5>
    {R.pipe(
      R.prop("properties"),
      R.map(renderPropertyInput(properties, updateProperty)),
    )(group)}
  </div>
));

// Render grouped properties
const renderGroupedProperties = R.curry(
  (properties, updateProperty, groupedProperties) =>
    R.ifElse(
      R.isEmpty,
      renderNoProperties,
      R.map(renderPropertyGroup(properties, updateProperty)),
    )(groupedProperties),
);

// Render loading properties
const renderLoadingProperties = R.always(
  <div className="property-loading">
    <span className="loading-icon">⏳</span>
    <p>Loading widget properties...</p>
  </div>,
);

// Render no widget selected message
const renderNoWidgetSelected = R.always(
  <div className="no-widget-selected">
    <span className="no-widget-icon">🧩</span>
    <p>Select a widget to view its properties</p>
  </div>,
);

// Filter properties by visible keys
const filterByVisibleKeys = R.curry((visibleKeys, parsedProperties) =>
  R.ifElse(
    R.isNil,
    R.always(parsedProperties),
    (keys) => R.filter((prop) => R.includes(R.prop("key", prop), keys), parsedProperties),
  )(visibleKeys),
);

// Render properties for selected widget with definition
const renderWidgetProperties = R.curry(
  (properties, updateProperty, visibleKeys, definition) =>
    R.pipe(
      parseWidgetProperties,
      filterByVisibleKeys(visibleKeys),
      groupPropertiesByCategory,
      renderGroupedProperties(properties, updateProperty),
    )(definition),
);

// Render dynamic properties section
const renderDynamicPropertiesSection = R.curry(
  (selectedWidget, widgetDefinition, properties, updateProperty, visibleKeys) => (
    <div className="property-section">
      {R.ifElse(
        R.identity,
        R.always(
          R.ifElse(
            R.identity,
            renderWidgetProperties(properties, updateProperty, visibleKeys),
            renderLoadingProperties,
          )(widgetDefinition),
        ),
        renderNoWidgetSelected,
      )(selectedWidget)}
    </div>
  ),
);

// Check if widgets are empty and no search term
const isEmptyWithoutSearch = R.converge(R.and, [
  R.pipe(R.prop("reorderedWidgets"), R.isEmpty),
  R.pipe(R.prop("widgetSearchTerm"), R.isEmpty),
]);

// Check if widgets are empty with search term
const isEmptyWithSearch = R.converge(R.and, [
  R.pipe(R.prop("reorderedWidgets"), R.isEmpty),
  R.pipe(R.prop("widgetSearchTerm"), R.complement(R.isEmpty)),
]);

// Create search not found message
const createSearchNotFoundMessage = R.pipe(
  R.prop("widgetSearchTerm"),
  (term) => `No widgets found matching "${term}"`,
);

// Render widget list items
const renderWidgetListItems = R.curry((widgetData, widgetHandlers) =>
  R.pipe(
    R.prop("reorderedWidgets"),
    R.map(
      renderWidgetItem(
        widgetData.selectedWidgetForPreview,
        widgetHandlers.setSelectedWidgetForPreview,
        widgetHandlers.handleWidgetDeleteClick,
      ),
    ),
  )(widgetData),
);

// Create widget list content predicates and renderers
const createWidgetListConditions = R.curry((widgetData, widgetHandlers) => [
  [
    isEmptyWithoutSearch,
    R.always(renderEmptyState("🧩", "No widgets registered")),
  ],
  [
    isEmptyWithSearch,
    R.pipe(createSearchNotFoundMessage, (msg) => renderEmptyState("🔍", msg)),
  ],
  [R.T, R.always(renderWidgetListItems(widgetData, widgetHandlers))],
]);

// Render add widget button
const renderAddWidgetButton = R.curry((modalHandlers) => (
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
      backgroundColor: "var(--theme-hover-bg)",
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
));

// Render widget list area
const renderWidgetListArea = R.curryN(
  4,
  (widgetData, widgetHandlers, modalHandlers, listRef) => (
    <div className="list-area">
      {renderAddWidgetButton(modalHandlers)}
      <div className="draggable-widget-list" ref={listRef}>
        {R.apply(R.cond, [
          createWidgetListConditions(widgetData, widgetHandlers),
        ])(widgetData)}
      </div>
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
    handleWidgetDeleteClick,
  }) => {
    // State for widget definition and dynamic properties
    const [widgetDefinition, setWidgetDefinition] = useState(null);
    const [dynamicProperties, setDynamicProperties] = useState({});

    // State for editorConfig
    const [editorConfigHandler, setEditorConfigHandler] = useState(null);
    const [visiblePropertyKeys, setVisiblePropertyKeys] = useState(null);

    // State for preview
    const [previewData, setPreviewData] = useState(null);
    const [isBuilding, setIsBuilding] = useState(false);
    const [buildError, setBuildError] = useState(null);
    const [packageManager, setPackageManager] = useState("bun");

    // Drag and drop functionality - only enabled when not searching
    const widgetsForDragDrop = R.ifElse(
      R.isEmpty,
      R.always(filteredWidgets),
      R.always([]),
    )(widgetSearchTerm);

    const [widgetListRef, reorderedWidgets, setReorderedWidgets] =
      useDragAndDrop(widgetsForDragDrop, {
        onSort: R.pipe(R.prop("values"), setWidgets),
      });

    // Update reordered widgets when filteredWidgets changes
    useEffect(() => {
      setReorderedWidgets(filteredWidgets);
    }, [filteredWidgets, setReorderedWidgets]);

    // Get selected widget (convert to string for comparison)
    const selectedWidget = R.pipe(
      R.find(R.propEq(String(selectedWidgetForPreview), "id")),
      R.defaultTo(null),
    )(widgets);

    // Handle successful widget definition load
    const handleWidgetDefinitionSuccess = R.curry(
      (setWidgetDefinition, setDynamicProperties, definition) =>
        R.pipe(
          R.identity,
          R.tap((def) => setWidgetDefinition(def)),
          R.tap((def) => setDynamicProperties(initializePropertyValues(def))),
        )(definition),
    );

    // Handle widget definition load error
    const handleWidgetDefinitionError = R.curry(
      (setWidgetDefinition, setDynamicProperties, error) =>
        R.pipe(
          R.identity,
          R.tap((err) =>
            console.error("Failed to parse widget properties:", err),
          ),
          R.tap(() => setWidgetDefinition(null)),
          R.tap(() => setDynamicProperties({})),
        )(error),
    );

    // Clear widget definition state
    const clearWidgetDefinitionState = () =>
      R.pipe(
        R.tap(() => setWidgetDefinition(null)),
        R.tap(() => setDynamicProperties({})),
        R.tap(() => setEditorConfigHandler(null)),
        R.tap(() => setVisiblePropertyKeys(null)),
      )();

    // Load editorConfig for widget
    const loadEditorConfig = async (widgetPath) => {
      try {
        const result = await invoke("read_editor_config", { widgetPath });
        if (result.found && result.content) {
          const handler = createEditorConfigHandler(result.content);
          setEditorConfigHandler(handler);
          return handler;
        }
        setEditorConfigHandler(null);
        return null;
      } catch (error) {
        console.error("Failed to load editorConfig:", error);
        setEditorConfigHandler(null);
        return null;
      }
    };

    // Load widget properties
    const loadWidgetProperties = R.curry(
      (selectedWidget, setWidgetDefinition, setDynamicProperties) =>
        invoke("parse_widget_properties", {
          widgetPath: R.prop("path", selectedWidget),
        })
          .then(
            handleWidgetDefinitionSuccess(
              setWidgetDefinition,
              setDynamicProperties,
            ),
          )
          .catch(
            handleWidgetDefinitionError(
              setWidgetDefinition,
              setDynamicProperties,
            ),
          ),
    );

    // Load widget definition and editorConfig when widget is selected
    useEffect(() => {
      if (!selectedWidget) {
        clearWidgetDefinitionState();
        return;
      }

      const loadWidgetData = async () => {
        // Load widget properties
        loadWidgetProperties(
          selectedWidget,
          setWidgetDefinition,
          setDynamicProperties,
        );

        // Load editorConfig
        await loadEditorConfig(R.prop("path", selectedWidget));
      };

      loadWidgetData();
    }, [selectedWidget]);

    // Update visible property keys when values or editorConfig changes
    useEffect(() => {
      if (!editorConfigHandler || !editorConfigHandler.isAvailable || !widgetDefinition) {
        setVisiblePropertyKeys(null);
        return;
      }

      const combinedValues = R.mergeRight(properties, dynamicProperties);
      const visibleKeys = editorConfigHandler.getVisiblePropertyKeys(
        combinedValues,
        widgetDefinition,
      );
      setVisiblePropertyKeys(visibleKeys);
    }, [editorConfigHandler, widgetDefinition, dynamicProperties, properties]);

    // Create property update handler for dynamic properties
    const updateDynamicProperty = R.curry((propertyKey, value) =>
      setDynamicProperties(R.assoc(propertyKey, value)),
    );

    // Combine static and dynamic properties for preview
    const combinedProperties = R.mergeRight(properties, dynamicProperties);

    // Handle Run Preview button click
    const handleRunPreview = async () => {
      if (!selectedWidget) return;

      setIsBuilding(true);
      setBuildError(null);

      try {
        console.log("[Widget Preview] Building widget:", selectedWidget);
        console.log("[Widget Preview] Package manager:", packageManager);

        const response = await invoke("build_widget_for_preview", {
          widgetPath: selectedWidget.path,
          packageManager: packageManager,
        });

        console.log("[Widget Preview] Build response:", response);

        if (response.success) {
          setPreviewData({
            bundle: response.bundle_content,
            widgetName: response.widget_name,
            widgetId: response.widget_id,
            properties: combinedProperties,
          });
          setBuildError(null);
        } else {
          setBuildError(response.error || "Build failed");
          setPreviewData(null);
        }
      } catch (error) {
        console.error("[Widget Preview] Error:", error);
        setBuildError(String(error));
        setPreviewData(null);
      } finally {
        setIsBuilding(false);
      }
    };

    return (
      <div className="base-manager widget-preview">
        {/* Left Panel - Widget List */}
        <div className="preview-left">
          <SearchBox
            placeholder="Search widgets by caption..."
            value={widgetSearchTerm}
            onChange={setWidgetSearchTerm}
          />
          {renderWidgetListArea(
            {
              reorderedWidgets,
              widgetSearchTerm,
              selectedWidgetForPreview,
            },
            {
              setSelectedWidgetForPreview,
              setWidgets,
              handleWidgetDeleteClick,
            },
            {
              setShowWidgetModal,
              setShowAddWidgetForm,
              setNewWidgetCaption,
              setNewWidgetPath,
            },
            widgetListRef,
          )}
        </div>

        {/* Middle Panel - Properties */}
        <div className="preview-middle">
          <div className="properties-header">
            <h3>Properties</h3>
            <div className="preview-controls">
              <select
                value={packageManager}
                onChange={(e) => setPackageManager(e.target.value)}
                disabled={isBuilding}
                className="package-manager-select"
              >
                <option value="npm">npm</option>
                <option value="yarn">yarn</option>
                <option value="pnpm">pnpm</option>
                <option value="bun">bun</option>
              </select>
              <button
                className="run-preview-button"
                onClick={handleRunPreview}
                disabled={!selectedWidget || isBuilding}
              >
                <span className="button-icon">{isBuilding ? "⏳" : "▶️"}</span>
                {isBuilding ? "Building..." : "Run Preview"}
              </button>
            </div>
          </div>
          {buildError && (
            <div className="build-error">
              <span className="error-icon">❌</span>
              <p>{buildError}</p>
            </div>
          )}
          {renderDynamicPropertiesSection(
            selectedWidget,
            widgetDefinition,
            combinedProperties,
            updateDynamicProperty,
            visiblePropertyKeys,
          )}
        </div>

        {/* Right Panel - Widget Preview */}
        <div className="preview-right">
          <div className="properties-header">
            <h3>Widget Preview</h3>
          </div>
          {previewData ? (
            <WidgetPreviewFrame
              bundle={previewData.bundle}
              widgetName={previewData.widgetName}
              widgetId={previewData.widgetId}
              properties={previewData.properties}
            />
          ) : (
            <div className="preview-instructions">
              <span className="preview-emoji">🍓</span>
              <p className="preview-message">
                Pick a widget, click Run Preview,
                <br />
                and watch the magic happen!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  },
);

WidgetPreview.displayName = "WidgetPreview";

export default WidgetPreview;
