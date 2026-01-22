import * as R from "ramda";
import { memo } from "react";
import PropertyGroupAccordion from "./PropertyGroupAccordion";
import PreviewBuildControls from "./PreviewBuildControls";
import { renderPropertyInputField } from "./propertyUtils";

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
  <div className="empty-state">
    <span className="empty-state-icon">🍓</span>
    <p className="empty-state-message">Select a widget to view its properties</p>
  </div>
);

const RootPropertyGroup = memo(({ properties, updateProperty, arrayHandlers, visibleKeys, rootProps }) => {
  if (R.isEmpty(rootProps)) return null;

  const filteredProps = visibleKeys
    ? R.filter((prop) => R.includes(R.prop("key", prop), visibleKeys), rootProps)
    : rootProps;

  if (R.isEmpty(filteredProps)) return null;

  return (
    <div className="property-group depth-0 expanded root-properties">
      <div className="property-group-header-static">
        <span className="property-group-title">General</span>
        <span className="property-group-count">{R.length(filteredProps)}</span>
      </div>
      <div className="property-group-content">
        {R.map(
          (prop) => renderPropertyInputField(properties, updateProperty, arrayHandlers, prop),
          filteredProps,
        )}
      </div>
    </div>
  );
});

RootPropertyGroup.displayName = "RootPropertyGroup";

const WidgetPropertyGroups = memo(({
  properties,
  updateProperty,
  arrayHandlers,
  expandedGroups,
  toggleGroup,
  visibleKeys,
  groupCounts,
  definition,
}) => {
  const rootProperties = R.propOr([], "properties", definition);
  const propertyGroups = R.propOr([], "propertyGroups", definition);

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
        arrayHandlers={arrayHandlers}
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
            arrayHandlers={arrayHandlers}
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
  arrayHandlers,
  expandedGroups,
  toggleGroup,
  visibleKeys,
  groupCounts,
  packageManager,
  setPackageManager,
  isBuilding,
  buildError,
  handleBuildAndRun,
  handleRunOnly,
  distExists,
}) => (
  <div className="preview-middle">
    <div className="properties-header">
      <h3>Properties</h3>
      <PreviewBuildControls
        selectedWidget={selectedWidget}
        packageManager={packageManager}
        setPackageManager={setPackageManager}
        isBuilding={isBuilding}
        buildError={buildError}
        handleBuildAndRun={handleBuildAndRun}
        handleRunOnly={handleRunOnly}
        distExists={distExists}
      />
    </div>
    <div className="property-section">
      {selectedWidget ? (
        widgetDefinition ? (
          <WidgetPropertyGroups
            properties={properties}
            updateProperty={updateProperty}
            arrayHandlers={arrayHandlers}
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
