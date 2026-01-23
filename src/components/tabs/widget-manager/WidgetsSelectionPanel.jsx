import * as R from "ramda";
import { memo, useEffect } from "react";
import SearchBox from "../../common/SearchBox";
import WidgetListItem from "../../common/WidgetListItem";
import { renderLoadingIndicator } from "../../common/LoadingIndicator";
import { renderPanel } from "../../common/Panel";
import { useDragAndDrop } from "@formkit/drag-and-drop/react";
import { STORAGE_KEYS, saveToStorage } from "../../../utils";
import { useI18n } from "../../../i18n/useI18n";

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

const renderAddWidgetItem = (modalHandlers, t) => (
  <div
    className="version-list-item add-widget-item"
    onClick={createAddWidgetClickHandler(modalHandlers)}
  >
    <div className="version-info">
      <span className="version-icon">➕</span>
      <div className="version-details">
        <span className="version-number">{R.pathOr("Add New Widget", ["widgets", "addNewWidget"], t)}</span>
        <span className="version-date">{R.pathOr("Click to add a widget", ["widgets", "clickToAdd"], t)}</span>
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
  const { t } = useI18n();
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
            {renderAddWidgetItem(modalHandlers, t)}
            <div ref={widgetListRef} className="draggable-widget-list" />
            {renderLoadingIndicator("🧩", R.pathOr("No widgets registered", ["widgets", "noWidgetsRegistered"], t))}
          </div>
        ),
      ],
      [
        () => R.isEmpty(widgetsToShow) && !R.isEmpty(widgetSearchTerm),
        () => (
          <div>
            {renderAddWidgetItem(modalHandlers, t)}
            <div ref={widgetListRef} className="draggable-widget-list" style={{ display: "none" }} />
            {renderLoadingIndicator(
              "🔍",
              R.pathOr(
                `No widgets found matching "${widgetSearchTerm}"`,
                ["widgets", "noWidgetsMatching"],
                t,
              ).replace("{term}", widgetSearchTerm),
            )}
          </div>
        ),
      ],
      [
        R.T,
        () => (
          <div>
            {renderAddWidgetItem(modalHandlers, t)}
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
          placeholder={R.pathOr("Search widgets by caption...", ["widgets", "searchWidgets"], t)}
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
