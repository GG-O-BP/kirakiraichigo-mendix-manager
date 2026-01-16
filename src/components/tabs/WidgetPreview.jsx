import * as R from "ramda";
import { memo, useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import SearchBox from "../common/SearchBox";
import DynamicPropertyInput from "../common/DynamicPropertyInput";
import WidgetPreviewFrame from "../common/WidgetPreviewFrame";
import { renderLoadingIndicator } from "../common/LoadingIndicator";
import { createPropertyChangeHandler } from "../../utils/functional";
import {
  createEditorConfigHandler,
  filterParsedPropertiesByKeys,
} from "../../utils/editorConfigParser";
import { initializePropertyValues } from "../../utils/dataProcessing";
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

// Count visible properties in a group (including nested groups)
const countVisibleGroupProperties = R.curry((visibleKeys, group) => {
  const groupProperties = R.propOr([], "properties", group);
  const filteredProperties = visibleKeys
    ? R.filter((prop) => R.includes(R.prop("key", prop), visibleKeys), groupProperties)
    : groupProperties;
  const directCount = R.length(filteredProperties);
  const nestedCount = R.pipe(
    R.propOr([], "property_groups"),
    R.map(countVisibleGroupProperties(visibleKeys)),
    R.sum,
  )(group);
  return directCount + nestedCount;
});

// Recursive component to render nested property groups
const PropertyGroupAccordion = ({
  group,
  groupPath,
  depth,
  properties,
  updateProperty,
  expandedGroups,
  toggleGroup,
  visibleKeys,
}) => {
  const caption = R.prop("caption", group);
  const groupId = groupPath ? `${groupPath}.${caption}` : caption;
  const isExpanded = R.propOr(true, groupId, expandedGroups);
  const groupProperties = R.propOr([], "properties", group);
  const nestedGroups = R.propOr([], "property_groups", group);

  // Count only visible properties
  const visibleCount = countVisibleGroupProperties(visibleKeys, group);

  // If no visible properties in this group or any nested groups, don't render
  if (visibleCount === 0) {
    return null;
  }

  // Filter properties by visible keys if provided
  const filteredProperties = visibleKeys
    ? R.filter((prop) => R.includes(R.prop("key", prop), visibleKeys), groupProperties)
    : groupProperties;

  // Parse properties for rendering
  const parsedProperties = R.map(
    R.pipe(
      R.applySpec({
        key: R.prop("key"),
        type: R.prop("property_type"),
        caption: R.prop("caption"),
        description: R.prop("description"),
        required: R.prop("required"),
        defaultValue: R.prop("default_value"),
        options: R.prop("options"),
      }),
      R.reject(R.isNil),
    ),
    filteredProperties,
  );

  // Filter nested groups that have visible properties
  const visibleNestedGroups = R.filter(
    (nestedGroup) => countVisibleGroupProperties(visibleKeys, nestedGroup) > 0,
    nestedGroups,
  );

  // Check if content has only nested groups (no properties)
  const hasOnlyNestedGroups = R.isEmpty(parsedProperties) && !R.isEmpty(visibleNestedGroups);
  const contentClassName = `property-group-content${hasOnlyNestedGroups ? " groups-only" : ""}`;

  return (
    <div className={`property-group depth-${depth} ${isExpanded ? "expanded" : "collapsed"}`}>
      <button
        type="button"
        className="property-group-header"
        onClick={() => toggleGroup(groupId)}
      >
        <span className="property-group-icon">{isExpanded ? "▼" : "▶"}</span>
        <span className="property-group-title">{caption}</span>
        <span className="property-group-count">{visibleCount}</span>
      </button>
      {isExpanded && (
        <div className={contentClassName}>
          {/* Render direct properties */}
          {R.map(
            (prop) => renderPropertyInput(properties, updateProperty, prop),
            parsedProperties,
          )}
          {/* Render nested groups that have visible properties */}
          {R.map(
            (nestedGroup) => (
              <PropertyGroupAccordion
                key={R.prop("caption", nestedGroup)}
                group={nestedGroup}
                groupPath={groupId}
                depth={depth + 1}
                properties={properties}
                updateProperty={updateProperty}
                expandedGroups={expandedGroups}
                toggleGroup={toggleGroup}
                visibleKeys={visibleKeys}
              />
            ),
            visibleNestedGroups,
          )}
        </div>
      )}
    </div>
  );
};

// Render root-level properties (not in any group)
const renderRootProperties = R.curry(
  (properties, updateProperty, visibleKeys, rootProps) => {
    if (R.isEmpty(rootProps)) return null;

    const filteredProps = visibleKeys
      ? R.filter((prop) => R.includes(R.prop("key", prop), visibleKeys), rootProps)
      : rootProps;

    if (R.isEmpty(filteredProps)) return null;

    const parsedProperties = R.map(
      R.pipe(
        R.applySpec({
          key: R.prop("key"),
          type: R.prop("property_type"),
          caption: R.prop("caption"),
          description: R.prop("description"),
          required: R.prop("required"),
          defaultValue: R.prop("default_value"),
          options: R.prop("options"),
        }),
        R.reject(R.isNil),
      ),
      filteredProps,
    );

    return (
      <div className="property-group depth-0 expanded root-properties">
        <div className="property-group-header-static">
          <span className="property-group-title">General</span>
          <span className="property-group-count">{R.length(parsedProperties)}</span>
        </div>
        <div className="property-group-content">
          {R.map(
            (prop) => renderPropertyInput(properties, updateProperty, prop),
            parsedProperties,
          )}
        </div>
      </div>
    );
  },
);

// Render all property groups with nested structure
const renderNestedPropertyGroups = R.curry(
  (properties, updateProperty, expandedGroups, toggleGroup, visibleKeys, definition) => {
    const rootProperties = R.propOr([], "properties", definition);
    const propertyGroups = R.propOr([], "property_groups", definition);

    // Count visible root properties
    const visibleRootProps = visibleKeys
      ? R.filter((prop) => R.includes(R.prop("key", prop), visibleKeys), rootProperties)
      : rootProperties;

    // Count visible properties in all groups
    const visibleGroupsCount = R.pipe(
      R.map(countVisibleGroupProperties(visibleKeys)),
      R.sum,
    )(propertyGroups);

    // Check if there are any visible properties at all
    const totalVisibleCount = R.length(visibleRootProps) + visibleGroupsCount;

    if (totalVisibleCount === 0) {
      return renderNoProperties();
    }

    // Filter groups that have visible properties
    const visibleGroups = R.filter(
      (group) => countVisibleGroupProperties(visibleKeys, group) > 0,
      propertyGroups,
    );

    return (
      <>
        {renderRootProperties(properties, updateProperty, visibleKeys, rootProperties)}
        {R.map(
          (group) => (
            <PropertyGroupAccordion
              key={R.prop("caption", group)}
              group={group}
              groupPath=""
              depth={0}
              properties={properties}
              updateProperty={updateProperty}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
              visibleKeys={visibleKeys}
            />
          ),
          visibleGroups,
        )}
      </>
    );
  },
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

// Render dynamic properties section using nested accordions
const renderDynamicPropertiesSection = R.curry(
  (selectedWidget, widgetDefinition, properties, updateProperty, expandedGroups, toggleGroup, visibleKeys) => (
    <div className="property-section">
      {R.ifElse(
        R.identity,
        R.always(
          R.ifElse(
            R.identity,
            renderNestedPropertyGroups(properties, updateProperty, expandedGroups, toggleGroup, visibleKeys),
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
    R.always(renderLoadingIndicator("🧩", "No widgets registered")),
  ],
  [
    isEmptyWithSearch,
    R.pipe(createSearchNotFoundMessage, (msg) => renderLoadingIndicator("🔍", msg)),
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

    // State for accordion expanded groups
    const [expandedGroups, setExpandedGroups] = useState({});

    // Toggle group expansion
    const toggleGroup = useCallback((category) => {
      setExpandedGroups((prev) => ({
        ...prev,
        [category]: !R.propOr(true, category, prev),
      }));
    }, []);

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

    // Clear widget definition state
    const clearWidgetDefinitionState = () => {
      setWidgetDefinition(null);
      setDynamicProperties({});
      setEditorConfigHandler(null);
      setVisiblePropertyKeys(null);
    };

    // Load widget definition and editorConfig when widget is selected
    useEffect(() => {
      if (!selectedWidget) {
        clearWidgetDefinitionState();
        return;
      }

      const widgetPath = R.prop("path", selectedWidget);

      const loadWidgetData = async () => {
        try {
          // Load widget definition and initial property values in parallel from Rust backend
          const [definition, initialValues, editorConfigResult] = await Promise.all([
            invoke("parse_widget_properties", { widgetPath }),
            initializePropertyValues(widgetPath),
            invoke("read_editor_config", { widgetPath }),
          ]);

          setWidgetDefinition(definition);
          setDynamicProperties(initialValues);

          // Handle editorConfig
          if (editorConfigResult.found && editorConfigResult.content) {
            const handler = createEditorConfigHandler(editorConfigResult.content);
            setEditorConfigHandler(handler);
          } else {
            setEditorConfigHandler(null);
          }
        } catch (error) {
          console.error("Failed to load widget data:", error);
          setWidgetDefinition(null);
          setDynamicProperties({});
          setEditorConfigHandler(null);
        }
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
        const response = await invoke("build_widget_for_preview", {
          widgetPath: selectedWidget.path,
          packageManager: packageManager,
        });

        if (response.success) {
          setPreviewData({
            bundle: response.bundle_content,
            css: response.css_content,
            widgetName: response.widget_name,
            widgetId: response.widget_id,
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
            expandedGroups,
            toggleGroup,
            visiblePropertyKeys,
          )}
        </div>

        {/* Right Panel - Widget Preview */}
        <div className="preview-right">
          {previewData ? (
            <WidgetPreviewFrame
              bundle={previewData.bundle}
              css={previewData.css}
              widgetName={previewData.widgetName}
              widgetId={previewData.widgetId}
              properties={combinedProperties}
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
