import * as R from "ramda";
import { memo } from "react";
import DynamicPropertyInput from "../../common/DynamicPropertyInput";
import PropertyGroupAccordion from "./PropertyGroupAccordion";

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

const parsePropertySpec = R.pipe(
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
);

const renderNoConfigurableProperties = () => (
  <div className="no-properties">
    <span className="info-icon">ℹ️</span>
    <p>No configurable properties found</p>
  </div>
);

const renderPropertiesLoadingState = () => (
  <div className="property-loading">
    <span className="loading-icon">⏳</span>
    <p>Loading widget properties...</p>
  </div>
);

const renderNoWidgetSelectedState = () => (
  <div className="no-widget-selected">
    <span className="no-widget-icon">🧩</span>
    <p>Select a widget to view its properties</p>
  </div>
);

const RootPropertyGroup = memo(({ properties, updateProperty, visibleKeys, rootProps }) => {
  if (R.isEmpty(rootProps)) return null;

  const filteredProps = visibleKeys
    ? R.filter((prop) => R.includes(R.prop("key", prop), visibleKeys), rootProps)
    : rootProps;

  if (R.isEmpty(filteredProps)) return null;

  const parsedProperties = R.map(parsePropertySpec, filteredProps);

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
});

RootPropertyGroup.displayName = "RootPropertyGroup";

const WidgetPropertyGroups = memo(({
  properties,
  updateProperty,
  expandedGroups,
  toggleGroup,
  visibleKeys,
  groupCounts,
  definition,
}) => {
  const rootProperties = R.propOr([], "properties", definition);
  const propertyGroups = R.propOr([], "property_groups", definition);

  const visibleRootProps = visibleKeys
    ? R.filter((prop) => R.includes(R.prop("key", prop), visibleKeys), rootProperties)
    : rootProperties;

  const visibleGroupsCount = R.pipe(R.values, R.sum)(groupCounts);
  const totalVisibleCount = R.length(visibleRootProps) + visibleGroupsCount;

  if (totalVisibleCount === 0) {
    return renderNoConfigurableProperties();
  }

  const visibleGroups = R.filter((group) => {
    const caption = R.prop("caption", group);
    return R.propOr(0, caption, groupCounts) > 0;
  }, propertyGroups);

  return (
    <>
      <RootPropertyGroup
        properties={properties}
        updateProperty={updateProperty}
        visibleKeys={visibleKeys}
        rootProps={rootProperties}
      />
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
});

WidgetPropertyGroups.displayName = "WidgetPropertyGroups";

const PropertiesPanel = memo(({
  selectedWidget,
  widgetDefinition,
  properties,
  updateProperty,
  expandedGroups,
  toggleGroup,
  visibleKeys,
  groupCounts,
  packageManager,
  setPackageManager,
  isBuilding,
  buildError,
  handleRunPreview,
}) => (
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
          onClick={() => handleRunPreview(selectedWidget)}
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
    <div className="property-section">
      {selectedWidget ? (
        widgetDefinition ? (
          <WidgetPropertyGroups
            properties={properties}
            updateProperty={updateProperty}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            visibleKeys={visibleKeys}
            groupCounts={groupCounts}
            definition={widgetDefinition}
          />
        ) : (
          renderPropertiesLoadingState()
        )
      ) : (
        renderNoWidgetSelectedState()
      )}
    </div>
  </div>
));

PropertiesPanel.displayName = "PropertiesPanel";

export default PropertiesPanel;
