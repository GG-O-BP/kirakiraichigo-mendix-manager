import * as R from "ramda";
import { memo, useState } from "react";
import DynamicPropertyInput from "./DynamicPropertyInput";

const ObjectListItem = memo(
  ({
    index,
    item,
    nestedPropertyGroups,
    isExpanded,
    onToggleExpanded,
    onRemove,
    onUpdateProperty,
    disabled = false,
    parentProperties = {},
  }) => {
    const [expandedGroups, setExpandedGroups] = useState({});

    const toggleGroupExpanded = (groupId) =>
      setExpandedGroups(
        R.over(R.lensProp(groupId), R.pipe(R.defaultTo(true), R.not))
      );

    const isGroupExpanded = (groupId) => R.propOr(true, groupId, expandedGroups);

    const getItemPreview = () => {
      const firstGroup = R.head(R.defaultTo([], nestedPropertyGroups));
      if (!firstGroup) return null;

      const firstProp = R.head(R.propOr([], "properties", firstGroup));
      if (!firstProp) return null;

      const key = R.prop("key", firstProp);
      const value = R.prop(key, item);
      return value && R.complement(R.isEmpty)(String(value))
        ? String(value)
        : null;
    };

    const itemPreview = getItemPreview();

    const handleHeaderKeyDown = (e) => {
      if (R.includes(R.prop("key", e), ["Enter", " "])) {
        e.preventDefault();
        onToggleExpanded();
      }
    };

    const renderItemHeader = () => (
      <div
        role="button"
        tabIndex={0}
        className="object-list-item-header"
        onClick={onToggleExpanded}
        onKeyDown={handleHeaderKeyDown}
        aria-expanded={isExpanded}
      >
        <span className={`object-list-item-icon ${isExpanded ? "expanded" : ""}`}>
          🍓
        </span>
        <span className="object-list-item-title">Item {index + 1}</span>
        {itemPreview && (
          <span className="object-list-item-preview">{itemPreview}</span>
        )}
        <button
          type="button"
          className="object-list-item-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={disabled}
          aria-label={`Remove item ${index + 1}`}
        >
          ✕
        </button>
      </div>
    );

    const renderPropertyGroup = (group, groupIndex, depth = 0) => {
      const groupCaption = R.prop("caption", group);
      const properties = R.propOr([], "properties", group);
      const nestedGroups = R.propOr([], "propertyGroups", group);
      const groupId = `${index}-${groupIndex}`;
      const groupExpanded = isGroupExpanded(groupId);
      const hasCaption = R.complement(R.isEmpty)(groupCaption);

      return (
        <div
          key={groupIndex}
          className={`object-list-property-group depth-${depth} ${groupExpanded ? "expanded" : "collapsed"}`}
        >
          {hasCaption && (
            <button
              type="button"
              className="object-list-group-header"
              onClick={() => toggleGroupExpanded(groupId)}
            >
              <span className={`object-list-group-icon ${groupExpanded ? "expanded" : ""}`}>
                🍓
              </span>
              <span className="object-list-group-caption">{groupCaption}</span>
              <span className="object-list-group-count">
                {R.length(properties)}
              </span>
            </button>
          )}
          <div className="object-list-group-content-wrapper">
            <div className="object-list-group-content">
              <div className="object-list-properties">
                {R.map(
                  (prop) => (
                    <DynamicPropertyInput
                      key={R.prop("key", prop)}
                      property={prop}
                      value={R.prop(R.prop("key", prop), item)}
                      onChange={(value) => onUpdateProperty(R.prop("key", prop), value)}
                      disabled={disabled}
                      showValidation={true}
                      allProperties={item}
                      parentProperties={parentProperties}
                    />
                  ),
                  properties
                )}
              </div>
              {R.addIndex(R.map)(
                (nestedGroup, nestedIndex) =>
                  renderPropertyGroup(nestedGroup, `${groupIndex}-${nestedIndex}`, depth + 1),
                nestedGroups
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className={`object-list-item ${isExpanded ? "expanded" : "collapsed"}`}>
        {renderItemHeader()}
        <div className="object-list-item-content-wrapper">
          <div className="object-list-item-content">
            {R.addIndex(R.map)(
              (group, idx) => renderPropertyGroup(group, idx, 0),
              R.defaultTo([], nestedPropertyGroups)
            )}
          </div>
        </div>
      </div>
    );
  }
);

ObjectListItem.displayName = "ObjectListItem";

export default ObjectListItem;
