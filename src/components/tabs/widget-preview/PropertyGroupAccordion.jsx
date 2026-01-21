import * as R from "ramda";
import { memo } from "react";
import { renderPropertyInputField } from "./propertyUtils";

const PropertyGroupAccordion = memo(({
  group,
  groupPath,
  depth,
  properties,
  updateProperty,
  arrayHandlers,
  expandedGroups,
  toggleGroup,
  visibleKeys,
  groupCounts,
}) => {
  const caption = R.prop("caption", group);
  const groupId = groupPath ? `${groupPath}.${caption}` : caption;
  const isExpanded = R.propOr(true, groupId, expandedGroups);
  const groupProperties = R.propOr([], "properties", group);
  const nestedGroups = R.propOr([], "propertyGroups", group);

  const visibleCount = R.propOr(0, groupId, groupCounts);

  if (visibleCount === 0) {
    return null;
  }

  const filteredProperties = visibleKeys
    ? R.filter((prop) => R.includes(R.prop("key", prop), visibleKeys), groupProperties)
    : groupProperties;

  const visibleNestedGroups = R.filter((nestedGroup) => {
    const nestedCaption = R.prop("caption", nestedGroup);
    const nestedGroupId = `${groupId}.${nestedCaption}`;
    return R.propOr(0, nestedGroupId, groupCounts) > 0;
  }, nestedGroups);

  const hasOnlyNestedGroups = R.isEmpty(filteredProperties) && !R.isEmpty(visibleNestedGroups);
  const contentClassName = `property-group-content${hasOnlyNestedGroups ? " groups-only" : ""}`;

  return (
    <div className={`property-group depth-${depth} ${isExpanded ? "expanded" : "collapsed"}`}>
      <button
        type="button"
        className="property-group-header"
        onClick={() => toggleGroup(groupId)}
      >
        <span className={`property-group-icon ${isExpanded ? "expanded" : ""}`}>🍓</span>
        <span className="property-group-title">{caption}</span>
        <span className="property-group-count">{visibleCount}</span>
      </button>
      <div className="property-group-content-wrapper">
        <div className={contentClassName}>
          {R.map(
            (prop) => renderPropertyInputField(properties, updateProperty, arrayHandlers, prop),
            filteredProperties,
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
                arrayHandlers={arrayHandlers}
                expandedGroups={expandedGroups}
                toggleGroup={toggleGroup}
                visibleKeys={visibleKeys}
                groupCounts={groupCounts}
              />
            ),
            visibleNestedGroups,
          )}
        </div>
      </div>
    </div>
  );
});

PropertyGroupAccordion.displayName = "PropertyGroupAccordion";

export default PropertyGroupAccordion;
