import * as R from "ramda";
import { memo, useState } from "react";
import DynamicPropertyInput from "./DynamicPropertyInput";

const expandedIconClassName = R.ifElse(R.identity, R.always("expanded"), R.always(""));
const expandCollapseClassName = R.ifElse(R.identity, R.always("expanded"), R.always("collapsed"));

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

    const getItemPreview = () =>
      R.pipe(
        R.defaultTo([]),
        R.head,
        R.ifElse(
          R.isNil,
          R.always(null),
          R.pipe(
            R.propOr([], "properties"),
            R.head,
            R.ifElse(
              R.isNil,
              R.always(null),
              R.pipe(
                R.prop("key"),
                (key) => R.prop(key, item),
                R.ifElse(
                  R.both(Boolean, R.pipe(String, R.isNotEmpty)),
                  String,
                  R.always(null),
                ),
              ),
            ),
          ),
        ),
      )(nestedPropertyGroups);

    const itemPreview = getItemPreview();

    const handleHeaderKeyDown = (e) =>
      R.when(
        (event) => R.includes(R.prop("key", event), ["Enter", " "]),
        (event) => {
          event.preventDefault();
          onToggleExpanded();
        },
      )(e);

    const renderItemHeader = () => (
      <div
        role="button"
        tabIndex={0}
        className="object-list-item-header"
        onClick={onToggleExpanded}
        onKeyDown={handleHeaderKeyDown}
        aria-expanded={isExpanded}
      >
        <span className={`object-list-item-icon ${expandedIconClassName(isExpanded)}`}>
          🍓
        </span>
        <span className="object-list-item-title">Item {R.inc(index)}</span>
        {R.ifElse(
          R.isNotNil,
          (preview) => (
            <span className="object-list-item-preview">{preview}</span>
          ),
          R.always(null),
        )(itemPreview)}
        <button
          type="button"
          className="object-list-item-remove"
          onClick={R.pipe(
            R.tap((e) => e.stopPropagation()),
            R.tap(() => onRemove()),
            R.always(undefined),
          )}
          disabled={disabled}
          aria-label={`Remove item ${R.inc(index)}`}
        >
          ✕
        </button>
      </div>
    );

    const renderPropertyGroup = (group, groupIndex, depth = 0) => {
      const groupCaption = R.prop("caption", group);
      const properties = R.propOr([], "properties", group);
      const nestedGroups = R.propOr([], "propertyGroups", group);
      const groupId = String(groupIndex);
      const groupExpanded = isGroupExpanded(groupId);
      const hasCaption = R.isNotEmpty(groupCaption);

      return (
        <div
          key={groupIndex}
          className={`object-list-property-group depth-${depth} ${expandCollapseClassName(groupExpanded)}`}
        >
          {R.ifElse(
            R.identity,
            () => (
              <button
                type="button"
                className="object-list-group-header"
                onClick={() => toggleGroupExpanded(groupId)}
              >
                <span className={`object-list-group-icon ${expandedIconClassName(groupExpanded)}`}>
                  🍓
                </span>
                <span className="object-list-group-caption">{groupCaption}</span>
                <span className="object-list-group-count">
                  {R.length(properties)}
                </span>
              </button>
            ),
            R.always(null),
          )(hasCaption)}
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
                  renderPropertyGroup(nestedGroup, `${groupIndex}-${nestedIndex}`, R.inc(depth)),
                nestedGroups
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className={`object-list-item ${expandCollapseClassName(isExpanded)}`}>
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
