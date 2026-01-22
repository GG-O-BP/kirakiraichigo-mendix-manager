import * as R from "ramda";
import { memo } from "react";
import PropertyGroupAccordion from "./PropertyGroupAccordion";
import PreviewBuildControls from "./PreviewBuildControls";
import { renderPropertyInputField } from "./propertyUtils";
import { useI18n } from "../../../i18n/useI18n";

const renderNoConfigurableProperties = (t) => (
  <div className="no-properties">
    <span className="info-icon">ℹ️</span>
    <p>{R.pathOr("No properties to set!", ["preview", "noProperties"], t)}</p>
  </div>
);

const renderPropertiesLoadingState = (t) => (
  <div className="property-loading">
    <span className="loading-icon">⏳</span>
    <p>{R.pathOr("Loading properties~", ["preview", "loadingProperties"], t)}</p>
  </div>
);

const renderNoWidgetSelectedState = (t) => (
  <div className="empty-state">
    <span className="empty-state-icon">🍓</span>
    <p className="empty-state-message">{R.pathOr("Pick a widget to see its properties!", ["preview", "selectToViewProperties"], t)}</p>
  </div>
);

const RootPropertyGroup = memo(({ properties, updateProperty, arrayHandlers, visibleKeys, rootProps, t }) => {
  if (R.isEmpty(rootProps)) return null;

  const filteredProps = visibleKeys
    ? R.filter((prop) => R.includes(R.prop("key", prop), visibleKeys), rootProps)
    : rootProps;

  if (R.isEmpty(filteredProps)) return null;

  return (
    <div className="property-group depth-0 expanded root-properties">
      <div className="property-group-header-static">
        <span className="property-group-title">{R.pathOr("General", ["preview", "general"], t)}</span>
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
  t,
}) => {
  const rootProperties = R.propOr([], "properties", definition);
  const propertyGroups = R.propOr([], "propertyGroups", definition);

  const visibleRootProps = visibleKeys
    ? R.filter((prop) => R.includes(R.prop("key", prop), visibleKeys), rootProperties)
    : rootProperties;

  const visibleGroupsCount = R.pipe(R.values, R.sum)(groupCounts);
  const totalVisibleCount = R.length(visibleRootProps) + visibleGroupsCount;

  if (totalVisibleCount === 0) {
    return renderNoConfigurableProperties(t);
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
        t={t}
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
}) => {
  const { t } = useI18n();

  return (
    <div className="preview-middle">
      <div className="properties-header">
        <h3>{R.pathOr("Properties", ["preview", "properties"], t)}</h3>
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
              t={t}
            />
          ) : (
            renderPropertiesLoadingState(t)
          )
        ) : (
          renderNoWidgetSelectedState(t)
        )}
      </div>
    </div>
  );
});

PropertiesPanel.displayName = "PropertiesPanel";

export default PropertiesPanel;
