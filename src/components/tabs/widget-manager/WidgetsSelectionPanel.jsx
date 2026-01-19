import * as R from "ramda";
import { memo, useEffect } from "react";
import SearchBox from "../../common/SearchBox";
import WidgetListItem from "../../common/WidgetListItem";
import { renderLoadingIndicator } from "../../common/LoadingIndicator";
import { renderPanel } from "../../common/Panel";
import { useDragAndDrop } from "@formkit/drag-and-drop/react";
import { STORAGE_KEYS, saveToStorage } from "../../../utils";

const persistWidgetSelection = (widgetSet) =>
  saveToStorage(STORAGE_KEYS.SELECTED_WIDGETS, Array.from(widgetSet)).catch(
    console.error,
  );

const toggleWidgetInSet = (widgetSet, widgetId) => {
  const newSet = new Set(widgetSet);
  if (newSet.has(widgetId)) {
    newSet.delete(widgetId);
  } else {
    newSet.add(widgetId);
  }
  return newSet;
};

const createWidgetClickHandler = R.curry(
  (setSelectedWidgets, widgetId) => {
    setSelectedWidgets((prev) => {
      const newSet = toggleWidgetInSet(prev, widgetId);
      persistWidgetSelection(newSet);
      return newSet;
    });
  },
);

const createAddWidgetClickHandler = (modalHandlers) => () => {
  modalHandlers.setShowWidgetModal(true);
  modalHandlers.setShowAddWidgetForm(false);
  modalHandlers.setNewWidgetCaption("");
  modalHandlers.setNewWidgetPath("");
};

const renderAddWidgetItem = (modalHandlers) => (
  <div
    className="version-list-item add-widget-item"
    onClick={createAddWidgetClickHandler(modalHandlers)}
  >
    <div className="version-info">
      <span className="version-icon">➕</span>
      <div className="version-details">
        <span className="version-number">Add New Widget</span>
        <span className="version-date">Click to add a widget</span>
      </div>
    </div>
  </div>
);

const WidgetsSelectionPanel = memo(({
  widgets,
  setWidgets,
  filteredWidgets,
  selectedWidgets,
  setSelectedWidgets,
  widgetSearchTerm,
  setWidgetSearchTerm,
  handleWidgetDeleteClick,
  modalHandlers,
}) => {
  const [widgetListRef, reorderedWidgets, setReorderedWidgets] =
    useDragAndDrop(filteredWidgets, {
      disabled: !R.isEmpty(widgetSearchTerm),
      onSort: ({ values }) => {
        if (R.isEmpty(widgetSearchTerm)) {
          setWidgets(values);
        }
      },
    });

  useEffect(() => {
    setReorderedWidgets(filteredWidgets);
  }, [filteredWidgets, setReorderedWidgets]);

  const renderWidgetsList = () => {
    const widgetsToShow = reorderedWidgets;

    return R.cond([
      [
        () => R.isEmpty(widgetsToShow) && R.isEmpty(widgetSearchTerm),
        () => (
          <div>
            {renderAddWidgetItem(modalHandlers)}
            <div ref={widgetListRef} className="draggable-widget-list" />
            {renderLoadingIndicator("🧩", "No widgets registered")}
          </div>
        ),
      ],
      [
        () => R.isEmpty(widgetsToShow) && !R.isEmpty(widgetSearchTerm),
        () => (
          <div>
            {renderAddWidgetItem(modalHandlers)}
            <div ref={widgetListRef} className="draggable-widget-list" style={{ display: "none" }} />
            {renderLoadingIndicator(
              "🔍",
              `No widgets found matching "${widgetSearchTerm}"`,
            )}
          </div>
        ),
      ],
      [
        R.T,
        () => (
          <div>
            {renderAddWidgetItem(modalHandlers)}
            <div ref={widgetListRef} className="draggable-widget-list">
              {R.map(
                (widget) => (
                  <WidgetListItem
                    key={R.prop("id", widget)}
                    widget={widget}
                    isSelected={selectedWidgets.has(R.prop("id", widget))}
                    onClick={() => createWidgetClickHandler(setSelectedWidgets, R.prop("id", widget))}
                    onDelete={handleWidgetDeleteClick}
                    showIcon={true}
                  />
                ),
                widgetsToShow,
              )}
            </div>
          </div>
        ),
      ],
    ])();
  };

  const searchControls = (
    <div className="search-controls">
      <div className="search-row">
        <SearchBox
          placeholder="Search widgets by caption..."
          value={widgetSearchTerm}
          onChange={setWidgetSearchTerm}
        />
      </div>
    </div>
  );

  return renderPanel({
    key: "widgets",
    className: "list-container",
    searchControls,
    content: renderWidgetsList(),
  });
});

WidgetsSelectionPanel.displayName = "WidgetsSelectionPanel";

export default WidgetsSelectionPanel;
