import * as R from "ramda";
import { memo, useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import SearchBox from "../common/SearchBox";
import WidgetListItem from "../common/WidgetListItem";
import DynamicPropertyInput from "../common/DynamicPropertyInput";
import WidgetPreviewFrame from "../common/WidgetPreviewFrame";
import { renderLoadingIndicator } from "../common/LoadingIndicator";
import { createEditorConfigHandler } from "../../utils/editorConfigParser";
import { initializePropertyValues, countAllWidgetGroupsVisibleProperties } from "../../utils/dataProcessing";
import { useDragAndDrop } from "@formkit/drag-and-drop/react";

const ADD_WIDGET_BUTTON_STYLE = {
  cursor: "pointer",
  backgroundColor: "var(--theme-hover-bg)",
};

const toggleWidgetSelection = R.curry((currentSelection, widgetId) =>
  R.ifElse(
    R.equals(currentSelection),
    R.always(null),
    R.always(widgetId),
  )(widgetId),
);

const renderNoConfigurableProperties = R.always(
  <div className="no-properties">
    <span className="info-icon">ℹ️</span>
    <p>No configurable properties found</p>
  </div>,
);

const renderPropertyInputField = R.curry((properties, updateProperty, property) => (
  <DynamicPropertyInput
    key={R.prop("key", property)}
    property={property}
    value={R.prop(R.prop("key", property), properties)}
    onChange={updateProperty(R.prop("key", property))}
    disabled={false}
    showValidation={true}
  />
));

const PropertyGroupAccordion = ({
  group,
  groupPath,
  depth,
  properties,
  updateProperty,
  expandedGroups,
  toggleGroup,
  visibleKeys,
  groupCounts,
}) => {
  const caption = R.prop("caption", group);
  const groupId = groupPath ? `${groupPath}.${caption}` : caption;
  const isExpanded = R.propOr(true, groupId, expandedGroups);
  const groupProperties = R.propOr([], "properties", group);
  const nestedGroups = R.propOr([], "property_groups", group);

  // Use pre-calculated count from groupCounts
  const visibleCount = R.propOr(0, groupId, groupCounts);

  if (visibleCount === 0) {
    return null;
  }

  const filteredProperties = visibleKeys
    ? R.filter((prop) => R.includes(R.prop("key", prop), visibleKeys), groupProperties)
    : groupProperties;

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

  // Filter nested groups using pre-calculated counts
  const visibleNestedGroups = R.filter((nestedGroup) => {
    const nestedCaption = R.prop("caption", nestedGroup);
    const nestedGroupId = `${groupId}.${nestedCaption}`;
    return R.propOr(0, nestedGroupId, groupCounts) > 0;
  }, nestedGroups);

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
          {R.map(
            (prop) => renderPropertyInputField(properties, updateProperty, prop),
            parsedProperties,
          )}
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
                groupCounts={groupCounts}
              />
            ),
            visibleNestedGroups,
          )}
        </div>
      )}
    </div>
  );
};

const renderRootPropertyGroup = R.curry(
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
            (prop) => renderPropertyInputField(properties, updateProperty, prop),
            parsedProperties,
          )}
        </div>
      </div>
    );
  },
);

const renderWidgetPropertyGroups = R.curry(
  (properties, updateProperty, expandedGroups, toggleGroup, visibleKeys, groupCounts, definition) => {
    const rootProperties = R.propOr([], "properties", definition);
    const propertyGroups = R.propOr([], "property_groups", definition);

    const visibleRootProps = visibleKeys
      ? R.filter((prop) => R.includes(R.prop("key", prop), visibleKeys), rootProperties)
      : rootProperties;

    // Sum all group counts from pre-calculated groupCounts
    const visibleGroupsCount = R.pipe(
      R.values,
      R.sum,
    )(groupCounts);

    const totalVisibleCount = R.length(visibleRootProps) + visibleGroupsCount;

    if (totalVisibleCount === 0) {
      return renderNoConfigurableProperties();
    }

    // Filter groups using pre-calculated counts (only top-level groups)
    const visibleGroups = R.filter((group) => {
      const caption = R.prop("caption", group);
      return R.propOr(0, caption, groupCounts) > 0;
    }, propertyGroups);

    return (
      <>
        {renderRootPropertyGroup(properties, updateProperty, visibleKeys, rootProperties)}
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
              groupCounts={groupCounts}
            />
          ),
          visibleGroups,
        )}
      </>
    );
  },
);

const renderPropertiesLoadingState = R.always(
  <div className="property-loading">
    <span className="loading-icon">⏳</span>
    <p>Loading widget properties...</p>
  </div>,
);

const renderNoWidgetSelectedState = R.always(
  <div className="no-widget-selected">
    <span className="no-widget-icon">🧩</span>
    <p>Select a widget to view its properties</p>
  </div>,
);

const renderPropertiesPanel = R.curry(
  (selectedWidget, widgetDefinition, properties, updateProperty, expandedGroups, toggleGroup, visibleKeys, groupCounts) => (
    <div className="property-section">
      {R.ifElse(
        R.identity,
        R.always(
          R.ifElse(
            R.identity,
            renderWidgetPropertyGroups(properties, updateProperty, expandedGroups, toggleGroup, visibleKeys, groupCounts),
            renderPropertiesLoadingState,
          )(widgetDefinition),
        ),
        renderNoWidgetSelectedState,
      )(selectedWidget)}
    </div>
  ),
);

const hasWidgetsWithoutSearch = R.converge(R.and, [
  R.pipe(R.prop("reorderedWidgets"), R.isEmpty),
  R.pipe(R.prop("widgetSearchTerm"), R.isEmpty),
]);

const hasNoSearchResults = R.converge(R.and, [
  R.pipe(R.prop("reorderedWidgets"), R.isEmpty),
  R.pipe(R.prop("widgetSearchTerm"), R.complement(R.isEmpty)),
]);

const formatSearchNotFoundMessage = R.pipe(
  R.prop("widgetSearchTerm"),
  (term) => `No widgets found matching "${term}"`,
);

const renderWidgetListItems = R.curry((widgetData, widgetHandlers) =>
  R.pipe(
    R.prop("reorderedWidgets"),
    R.map((widget) => (
      <WidgetListItem
        key={R.prop("id", widget)}
        widget={widget}
        isSelected={R.equals(widgetData.selectedWidgetForPreview, R.prop("id", widget))}
        onClick={() => widgetHandlers.setSelectedWidgetForPreview(
          toggleWidgetSelection(widgetData.selectedWidgetForPreview, R.prop("id", widget))
        )}
        onDelete={widgetHandlers.handleWidgetDeleteClick}
        showIcon={false}
      />
    )),
  )(widgetData),
);

const buildWidgetListRenderConditions = R.curry((widgetData, widgetHandlers) => [
  [
    hasWidgetsWithoutSearch,
    R.always(renderLoadingIndicator("🧩", "No widgets registered")),
  ],
  [
    hasNoSearchResults,
    R.pipe(formatSearchNotFoundMessage, (msg) => renderLoadingIndicator("🔍", msg)),
  ],
  [R.T, R.always(renderWidgetListItems(widgetData, widgetHandlers))],
]);

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
    style={ADD_WIDGET_BUTTON_STYLE}
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

const renderWidgetListPanel = R.curryN(
  4,
  (widgetData, widgetHandlers, modalHandlers, listRef) => (
    <div className="list-area">
      {renderAddWidgetButton(modalHandlers)}
      <div className="draggable-widget-list" ref={listRef}>
        {R.apply(R.cond, [
          buildWidgetListRenderConditions(widgetData, widgetHandlers),
        ])(widgetData)}
      </div>
    </div>
  ),
);

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
    const [widgetDefinition, setWidgetDefinition] = useState(null);
    const [dynamicProperties, setDynamicProperties] = useState({});
    const [editorConfigHandler, setEditorConfigHandler] = useState(null);
    const [visiblePropertyKeys, setVisiblePropertyKeys] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [isBuilding, setIsBuilding] = useState(false);
    const [buildError, setBuildError] = useState(null);
    const [packageManager, setPackageManager] = useState("bun");
    const [expandedGroups, setExpandedGroups] = useState({});
    const [groupCounts, setGroupCounts] = useState({});

    const toggleGroup = useCallback((category) => {
      setExpandedGroups((prev) => ({
        ...prev,
        [category]: !R.propOr(true, category, prev),
      }));
    }, []);

    const widgetsForDragDrop = R.ifElse(
      R.isEmpty,
      R.always(filteredWidgets),
      R.always([]),
    )(widgetSearchTerm);

    const [widgetListRef, reorderedWidgets, setReorderedWidgets] =
      useDragAndDrop(widgetsForDragDrop, {
        onSort: R.pipe(R.prop("values"), setWidgets),
      });

    useEffect(() => {
      setReorderedWidgets(filteredWidgets);
    }, [filteredWidgets, setReorderedWidgets]);

    const selectedWidget = R.pipe(
      R.find(R.propEq(String(selectedWidgetForPreview), "id")),
      R.defaultTo(null),
    )(widgets);

    const resetWidgetPropertiesState = () => {
      setWidgetDefinition(null);
      setDynamicProperties({});
      setEditorConfigHandler(null);
      setVisiblePropertyKeys(null);
      setGroupCounts({});
    };

    useEffect(() => {
      if (!selectedWidget) {
        resetWidgetPropertiesState();
        return;
      }

      const widgetPath = R.prop("path", selectedWidget);

      const loadWidgetData = async () => {
        try {
          const [definition, initialValues, editorConfigResult] = await Promise.all([
            invoke("parse_widget_properties", { widgetPath }),
            initializePropertyValues(widgetPath),
            invoke("read_editor_config", { widgetPath }),
          ]);

          setWidgetDefinition(definition);
          setDynamicProperties(initialValues);

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

    // Calculate group counts when widgetDefinition or visiblePropertyKeys change
    useEffect(() => {
      if (!widgetDefinition) {
        setGroupCounts({});
        return;
      }

      const propertyGroups = R.propOr([], "property_groups", widgetDefinition);
      if (R.isEmpty(propertyGroups)) {
        setGroupCounts({});
        return;
      }

      const calculateCounts = async () => {
        try {
          const results = await countAllWidgetGroupsVisibleProperties(
            propertyGroups,
            visiblePropertyKeys,
          );
          // Convert array of { group_path, count } to object { [group_path]: count }
          const countsMap = R.pipe(
            R.map((item) => [item.group_path, item.count]),
            R.fromPairs,
          )(results);
          setGroupCounts(countsMap);
        } catch (error) {
          console.error("Failed to calculate group counts:", error);
          setGroupCounts({});
        }
      };

      calculateCounts();
    }, [widgetDefinition, visiblePropertyKeys]);

    const updateDynamicProperty = R.curry((propertyKey, value) =>
      setDynamicProperties(R.assoc(propertyKey, value)),
    );

    const combinedProperties = R.mergeRight(properties, dynamicProperties);

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
        <div className="preview-left">
          <SearchBox
            placeholder="Search widgets by caption..."
            value={widgetSearchTerm}
            onChange={setWidgetSearchTerm}
          />
          {renderWidgetListPanel(
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
          {renderPropertiesPanel(
            selectedWidget,
            widgetDefinition,
            combinedProperties,
            updateDynamicProperty,
            expandedGroups,
            toggleGroup,
            visiblePropertyKeys,
            groupCounts,
          )}
        </div>

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
