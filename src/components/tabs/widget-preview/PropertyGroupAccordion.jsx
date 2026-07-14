import * as R from "ramda";
import { memo } from "react";
import { renderPropertyInputField } from "./propertyUtils";

const expandedIconClassName = R.ifElse(R.identity, R.always("expanded"), R.always(""));
const expandCollapseClassName = R.ifElse(R.identity, R.always("expanded"), R.always("collapsed"));

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
  const groupId = R.ifElse(
    R.either(R.isNil, R.isEmpty),
    R.always(caption),
    (path) => `${path}.${caption}`,
  )(groupPath);
  const isExpanded = R.propOr(true, groupId, expandedGroups);
  const groupProperties = R.propOr([], "properties", group);
  const nestedGroups = R.propOr([], "propertyGroups", group);

  const visibleCount = R.propOr(0, groupId, groupCounts);

  const filteredProperties = R.ifElse(
    R.isNil,
    R.always(groupProperties),
    (keys) => R.filter((prop) => R.includes(R.prop("key", prop), keys), groupProperties),
  )(visibleKeys);

  const visibleNestedGroups = R.filter(
    (nestedGroup) =>
      R.gt(
        R.propOr(0, `${groupId}.${R.prop("caption", nestedGroup)}`, groupCounts),
        0,
      ),
    nestedGroups,
  );

  const hasOnlyNestedGroups = R.and(
    R.isEmpty(filteredProperties),
    R.isNotEmpty(visibleNestedGroups),
  );
  const contentClassName = `property-group-content${R.ifElse(
    R.identity,
    R.always(" groups-only"),
    R.always(""),
  )(hasOnlyNestedGroups)}`;

  return R.ifElse(
    R.equals(0),
    R.always(null),
    () => (
      <div className={`property-group depth-${depth} ${expandCollapseClassName(isExpanded)}`}>
        <button
          type="button"
          className="property-group-header"
          onClick={() => toggleGroup(groupId)}
        >
          <span className={`property-group-icon ${expandedIconClassName(isExpanded)}`}>🍓</span>
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
                  depth={R.inc(depth)}
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
    ),
  )(visibleCount);
});

PropertyGroupAccordion.displayName = "PropertyGroupAccordion";

export default PropertyGroupAccordion;
