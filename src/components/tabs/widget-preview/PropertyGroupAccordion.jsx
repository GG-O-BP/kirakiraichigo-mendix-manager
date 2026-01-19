import * as R from "ramda";
import { memo } from "react";
import DynamicPropertyInput from "../../common/DynamicPropertyInput";

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

const PropertyGroupAccordion = memo(({
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

  const visibleCount = R.propOr(0, groupId, groupCounts);

  if (visibleCount === 0) {
    return null;
  }

  const filteredProperties = visibleKeys
    ? R.filter((prop) => R.includes(R.prop("key", prop), visibleKeys), groupProperties)
    : groupProperties;

  const parsedProperties = R.map(parsePropertySpec, filteredProperties);

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
});

PropertyGroupAccordion.displayName = "PropertyGroupAccordion";

export default PropertyGroupAccordion;
