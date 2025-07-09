import * as R from "ramda";
import { memo } from "react";

// Get icon with default fallback
const getIcon = R.propOr("🍓", "icon");

// Get label from item
const getLabel = R.prop("label");

// Create click handler
const createClickHandler = R.curry((onClick, item) => () => onClick(item));

// ListItem component with functional approach
const ListItem = memo(({ item, onClick, children }) => (
  <div className="list-item" onClick={createClickHandler(onClick, item)}>
    <span className="item-icon">{getIcon(item)}</span>
    <span className="item-label">{getLabel(item)}</span>
    {children}
    <span className="item-sparkle">·</span>
  </div>
));

ListItem.displayName = "ListItem";

export default ListItem;
