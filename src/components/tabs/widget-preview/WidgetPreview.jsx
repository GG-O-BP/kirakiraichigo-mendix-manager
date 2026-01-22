import * as R from "ramda";
import { memo, useEffect } from "react";
import {
  useWidgetCollectionContext,
  useWidgetPreviewContext,
  useWidgetFormContext,
  useModalContext,
} from "../../../contexts";
import { useWidgetProperties, usePreviewBuild } from "../../../hooks";
import WidgetSelectionPanel from "./WidgetSelectionPanel";
import PropertiesPanel from "./PropertiesPanel";
import PreviewPanel from "./PreviewPanel";

const WidgetPreview = memo(() => {
  const widgetCollectionContext = useWidgetCollectionContext();
  const widgetPreviewContext = useWidgetPreviewContext();
  const widgetFormContext = useWidgetFormContext();
  const modalContext = useModalContext();

  const {
    widgets,
    setWidgets,
    filteredWidgets,
    widgetSearchTerm,
    setWidgetSearchTerm,
  } = widgetCollectionContext;

  const {
    selectedWidgetForPreview,
    setSelectedWidgetForPreview,
    properties,
  } = widgetPreviewContext;

  const { setNewWidgetCaption, setNewWidgetPath } = widgetFormContext;

  const {
    setShowWidgetModal,
    setShowAddWidgetForm,
    handleWidgetDeleteClick,
  } = modalContext;

  const selectedWidget = R.pipe(
    R.find(R.propEq(String(selectedWidgetForPreview), "id")),
    R.defaultTo(null),
  )(widgets);

  const {
    widgetDefinition,
    updateProperty,
    arrayHandlers,
    visiblePropertyKeys,
    groupCounts,
    expandedGroups,
    toggleGroup,
    combinedProperties,
  } = useWidgetProperties(selectedWidget, properties);

  const {
    previewData,
    isBuilding,
    buildError,
    packageManager,
    setPackageManager,
    handleBuildAndRun,
    handleRunOnly,
    distExists,
    checkDistExists,
  } = usePreviewBuild();

  useEffect(() => {
    checkDistExists(R.prop("path", selectedWidget));
  }, [selectedWidget, checkDistExists]);

  const modalHandlers = {
    setShowWidgetModal,
    setShowAddWidgetForm,
    setNewWidgetCaption,
    setNewWidgetPath,
  };

  return (
    <div className="base-manager widget-preview">
      <WidgetSelectionPanel
        widgets={widgets}
        setWidgets={setWidgets}
        filteredWidgets={filteredWidgets}
        widgetSearchTerm={widgetSearchTerm}
        setWidgetSearchTerm={setWidgetSearchTerm}
        selectedWidgetForPreview={selectedWidgetForPreview}
        setSelectedWidgetForPreview={setSelectedWidgetForPreview}
        handleWidgetDeleteClick={handleWidgetDeleteClick}
        modalHandlers={modalHandlers}
      />
      <PropertiesPanel
        selectedWidget={selectedWidget}
        widgetDefinition={widgetDefinition}
        properties={combinedProperties}
        updateProperty={updateProperty}
        arrayHandlers={arrayHandlers}
        expandedGroups={expandedGroups}
        toggleGroup={toggleGroup}
        visibleKeys={visiblePropertyKeys}
        groupCounts={groupCounts}
        packageManager={packageManager}
        setPackageManager={setPackageManager}
        isBuilding={isBuilding}
        buildError={buildError}
        handleBuildAndRun={handleBuildAndRun}
        handleRunOnly={handleRunOnly}
        distExists={distExists}
      />
      <PreviewPanel
        previewData={previewData}
        properties={combinedProperties}
        widgetDefinition={widgetDefinition}
        isBuilding={isBuilding}
      />
    </div>
  );
});

WidgetPreview.displayName = "WidgetPreview";

export default WidgetPreview;
