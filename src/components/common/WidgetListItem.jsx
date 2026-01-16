import * as R from "ramda";
import { memo } from "react";

const getWidgetClassName = R.curry((isSelected) =>
  R.join(" ", [
    "version-list-item",
    "widget-item-clickable",
    isSelected ? "selected" : "",
  ]),
);

const handleDeleteClick = R.curry((onDelete, widget, e) =>
  R.pipe(
    R.tap(() => e.preventDefault()),
    R.tap(() => e.stopPropagation()),
    R.always(widget),
    onDelete,
  )(),
);

const WidgetListItem = memo(
  ({
    widget,
    isSelected,
    onClick,
    onDelete,
    showIcon = true,
    selectedIcon = "☑️",
    unselectedIcon = "🧩",
  }) => {
    const icon = isSelected ? selectedIcon : unselectedIcon;

    return (
      <div
        key={R.prop("id", widget)}
        data-label={R.prop("id", widget)}
        className={getWidgetClassName(isSelected)}
        onClick={onClick}
      >
        <div className="version-info">
          {showIcon && <span className="version-icon">{icon}</span>}
          <div className="version-details">
            <span className="version-number">{R.prop("caption", widget)}</span>
            <span className="version-date">{R.prop("path", widget)}</span>
          </div>
        </div>
        <button
          className="install-button uninstall-button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleDeleteClick(onDelete, widget)}
        >
          <span className="button-icon">🗑️</span>
        </button>
      </div>
    );
  },
);

WidgetListItem.displayName = "WidgetListItem";

export default WidgetListItem;
