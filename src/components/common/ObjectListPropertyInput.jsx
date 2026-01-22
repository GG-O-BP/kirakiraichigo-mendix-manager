import * as R from "ramda";
import { memo, useCallback, useState } from "react";
import ObjectListItem from "./ObjectListItem";

const createDefaultItemFromNestedGroups = (nestedPropertyGroups) => {
  const defaultItem = {};

  const processGroup = (group) => {
    R.forEach((prop) => {
      const defaultValue = R.cond([
        [R.equals("boolean"), R.always(false)],
        [R.equals("integer"), R.always(0)],
        [R.equals("decimal"), R.always(0.0)],
        [R.T, R.always("")],
      ])(R.prop("type", prop));

      defaultItem[R.prop("key", prop)] = R.propOr(
        defaultValue,
        "defaultValue",
        prop
      );
    }, R.propOr([], "properties", group));

    R.forEach(processGroup, R.propOr([], "propertyGroups", group));
  };

  R.forEach(processGroup, R.defaultTo([], nestedPropertyGroups));

  return defaultItem;
};

const findLinkedDatasources = (nestedPropertyGroups) => {
  const datasources = new Set();

  const processGroup = (group) => {
    R.forEach((prop) => {
      const dataSource = R.prop("dataSource", prop);
      if (dataSource) {
        const cleanSource = R.replace(/^\.\.\//, "", dataSource);
        datasources.add(cleanSource);
      }
    }, R.propOr([], "properties", group));

    R.forEach(processGroup, R.propOr([], "propertyGroups", group));
  };

  R.forEach(processGroup, R.defaultTo([], nestedPropertyGroups));

  return Array.from(datasources);
};

const ObjectListPropertyInput = memo(
  ({
    property,
    items,
    onAddItem,
    onRemoveItem,
    onUpdateItemProperty,
    disabled = false,
    parentProperties = {},
  }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [expandedItems, setExpandedItems] = useState({});

    const caption = R.prop("caption", property);
    const description = R.prop("description", property);
    const nestedPropertyGroups = R.prop("nestedPropertyGroups", property);
    const itemCount = R.length(R.defaultTo([], items));
    const linkedDatasources = findLinkedDatasources(nestedPropertyGroups);

    const toggleExpanded = useCallback(() => setIsExpanded(R.not), []);

    const toggleItemExpanded = useCallback(
      (index) =>
        setExpandedItems(
          R.over(R.lensProp(index), R.pipe(R.defaultTo(true), R.not))
        ),
      []
    );

    const handleAddItem = useCallback(() => {
      const defaultItem = createDefaultItemFromNestedGroups(nestedPropertyGroups);
      onAddItem(defaultItem);
    }, [nestedPropertyGroups, onAddItem]);

    const renderDatasourceConnection = () =>
      R.ifElse(
        R.isEmpty,
        R.always(null),
        R.always(
          <div className="object-list-datasource-link">
            <span className="datasource-link-icon">⟷</span>
            <span className="datasource-link-text">
              {R.join(", ", linkedDatasources)}
            </span>
          </div>
        )
      )(linkedDatasources);

    const handleAddClick = useCallback(
      (e) => {
        e.stopPropagation();
        handleAddItem();
      },
      [handleAddItem]
    );

    const renderHeader = () => (
      <div className="object-list-header">
        <button
          type="button"
          className="object-list-header-toggle"
          onClick={toggleExpanded}
        >
          <span className={`object-list-icon ${isExpanded ? "expanded" : ""}`}>
            🍓
          </span>
          <span className="object-list-title-text">{caption}</span>
          {renderDatasourceConnection()}
          <span className="object-list-count">{itemCount}</span>
        </button>
        <button
          type="button"
          className="object-list-add-btn"
          onClick={handleAddClick}
          disabled={disabled}
          aria-label="Add item"
        >
          +
        </button>
      </div>
    );

    const renderEmptyState = () => (
      <div className="object-list-empty">
        <span className="empty-text">No items added yet</span>
      </div>
    );

    const renderItems = () =>
      R.addIndex(R.map)(
        (item, index) => (
          <ObjectListItem
            key={index}
            index={index}
            item={item}
            nestedPropertyGroups={nestedPropertyGroups}
            isExpanded={R.propOr(true, index, expandedItems)}
            onToggleExpanded={() => toggleItemExpanded(index)}
            onRemove={() => onRemoveItem(index)}
            onUpdateProperty={(nestedKey, value) =>
              onUpdateItemProperty(index, nestedKey, value)
            }
            disabled={disabled}
            parentProperties={parentProperties}
          />
        ),
        R.defaultTo([], items)
      );

    return (
      <div className={`object-list-container ${isExpanded ? "expanded" : "collapsed"}`}>
        {renderHeader()}
        <div className="object-list-content-wrapper">
          <div className="object-list-content">
            {R.ifElse(
              R.isEmpty,
              R.always(renderEmptyState()),
              R.always(renderItems())
            )(R.defaultTo([], items))}
          </div>
        </div>
      </div>
    );
  }
);

ObjectListPropertyInput.displayName = "ObjectListPropertyInput";

export default ObjectListPropertyInput;
