import * as R from "ramda";
import { memo, useEffect } from "react";
import SearchBox from "../../common/SearchBox";
import WidgetListItem from "../../common/WidgetListItem";
import { renderLoadingIndicator } from "../../common/LoadingIndicator";
import { useDragAndDrop } from "@formkit/drag-and-drop/react";
import { useI18n } from "../../../i18n/useI18n";

const ADD_WIDGET_BUTTON_STYLE = {
  cursor: "pointer",
  backgroundColor: "var(--theme-hover-bg)",
};

const toggleWidgetSelection = R.curry((currentSelection, widgetId) =>
  R.ifElse(
    R.equals(currentSelection),
    R.always(null),
    R.always(widgetId),
  )(widgetId),
);

const isWidgetSelectedForPreview = R.curry((selectedWidgetId, widget) =>
  R.equals(selectedWidgetId, R.prop("id", widget)),
);

const renderAddWidgetButton = ({ setShowWidgetModal, setShowAddWidgetForm, setNewWidgetCaption, setNewWidgetPath }, t) => (
  <div
    className="version-list-item"
    onClick={R.pipe(
      R.tap(() => setShowWidgetModal(true)),
      R.tap(() => setShowAddWidgetForm(false)),
      R.tap(() => setNewWidgetCaption("")),
      R.tap(() => setNewWidgetPath("")),
      R.always(undefined),
    )}
    style={ADD_WIDGET_BUTTON_STYLE}
  >
    <div className="version-info">
      <span className="version-icon">➕</span>
      <div className="version-details">
        <span className="version-number">{R.pathOr("Add a new widget", ["widgets", "addNewWidget"], t)}</span>
        <span className="version-date">{R.pathOr("Click to add a widget~!", ["widgets", "clickToAdd"], t)}</span>
      </div>
    </div>
  </div>
);

const WidgetSelectionPanel = memo(({
  widgets,
  setWidgets,
  filteredWidgets,
  widgetSearchTerm,
  setWidgetSearchTerm,
  selectedWidgetForPreview,
  setSelectedWidgetForPreview,
  handleWidgetDeleteClick,
  modalHandlers,
}) => {
  const { t } = useI18n();

  const widgetsForDragDrop = R.ifElse(
    R.isEmpty,
    R.always(filteredWidgets),
    R.always([]),
  )(widgetSearchTerm);

  const [widgetListRef, reorderedWidgets, setReorderedWidgets] =
    useDragAndDrop(widgetsForDragDrop, {
      onSort: R.pipe(R.prop("values"), setWidgets),
    });

  useEffect(() => {
    setReorderedWidgets(filteredWidgets);
  }, [filteredWidgets, setReorderedWidgets]);

  const hasWidgetsWithoutSearch = R.and(R.isEmpty(reorderedWidgets), R.isEmpty(widgetSearchTerm));
  const hasNoSearchResults = R.and(R.isEmpty(reorderedWidgets), R.isNotEmpty(widgetSearchTerm));

  const renderWidgetsList = () =>
    R.cond([
      [
        R.always(hasWidgetsWithoutSearch),
        () => renderLoadingIndicator("🧩", R.pathOr("No widgets registered yet!", ["widgets", "noWidgetsRegistered"], t)),
      ],
      [
        R.always(hasNoSearchResults),
        () =>
          renderLoadingIndicator(
            "🔍",
            R.replace(
              "{term}",
              widgetSearchTerm,
              R.pathOr(`Can't find "${widgetSearchTerm}"~`, ["widgets", "noWidgetsMatching"], t),
            ),
          ),
      ],
      [
        R.T,
        () =>
          R.map(
            (widget) => (
              <WidgetListItem
                key={R.prop("id", widget)}
                widget={widget}
                isSelected={isWidgetSelectedForPreview(selectedWidgetForPreview, widget)}
                onClick={() => setSelectedWidgetForPreview(
                  toggleWidgetSelection(selectedWidgetForPreview, R.prop("id", widget))
                )}
                onDelete={handleWidgetDeleteClick}
                showIcon={false}
              />
            ),
            reorderedWidgets,
          ),
      ],
    ])();

  return (
    <div className="preview-left">
      <SearchBox
        placeholder={R.pathOr("Search widgets~", ["widgets", "searchWidgets"], t)}
        value={widgetSearchTerm}
        onChange={setWidgetSearchTerm}
      />
      <div className="list-area">
        {renderAddWidgetButton(modalHandlers, t)}
        <div className="draggable-widget-list" ref={widgetListRef}>
          {renderWidgetsList()}
        </div>
      </div>
    </div>
  );
});

WidgetSelectionPanel.displayName = "WidgetSelectionPanel";

export default WidgetSelectionPanel;
