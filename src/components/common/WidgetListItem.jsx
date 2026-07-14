import * as R from "ramda";
import { memo } from "react";

const getWidgetClassName = (isSelected) =>
  R.join(" ", [
    "version-list-item",
    "widget-item-clickable",
    R.ifElse(R.identity, R.always("selected"), R.always(""))(isSelected),
  ]);

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
    isSelected = false,
    onClick,
    onDelete,
    showIcon = true,
    selectedIcon = "☑️",
    unselectedIcon = "🧩",
  }) => {
    const widgetId = R.prop("id", widget);
    const icon = R.ifElse(R.identity, R.always(selectedIcon), R.always(unselectedIcon))(isSelected);

    return (
      <div
        key={widgetId}
        data-label={widgetId}
        className={getWidgetClassName(isSelected)}
        onClick={onClick}
      >
        <div className="version-info">
          {R.ifElse(
            R.identity,
            () => (<span className="version-icon">{icon}</span>),
            R.always(null),
          )(showIcon)}
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
