import * as R from "ramda";
import { memo, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  useWidgetCollectionContext,
  useWidgetPreviewContext,
  useWidgetFormContext,
} from "../../../contexts";
import { useWidgetProperties } from "../../../hooks";
import {
  showWidgetModalAtom,
  showAddWidgetFormAtom,
  openWidgetDeleteModalAtom,
} from "../../../atoms";
import WidgetSelectionPanel from "./WidgetSelectionPanel";
import PropertiesPanel from "./PropertiesPanel";
import PreviewPanel from "./PreviewPanel";

const WidgetPreview = memo(() => {
  const widgetCollectionContext = useWidgetCollectionContext();
  const widgetPreviewContext = useWidgetPreviewContext();
  const widgetFormContext = useWidgetFormContext();

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
    dynamicProperties,
    setDynamicProperties,
    previewData,
    isBuilding,
    buildError,
    packageManager,
    setPackageManager,
    distExists,
    checkDistExists,
    handleBuildAndRun,
    handleRunOnly,
  } = widgetPreviewContext;

  const { setNewWidgetCaption, setNewWidgetPath } = widgetFormContext;

  const [, setShowWidgetModal] = useAtom(showWidgetModalAtom);
  const [, setShowAddWidgetForm] = useAtom(showAddWidgetFormAtom);
  const handleWidgetDeleteClick = useSetAtom(openWidgetDeleteModalAtom);

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
  } = useWidgetProperties(selectedWidget, properties, {
    dynamicProperties,
    setDynamicProperties,
  });

  useEffect(() => {
    checkDistExists();
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
        onDatasourceCommit={updateProperty}
      />
    </div>
  );
});

WidgetPreview.displayName = "WidgetPreview";

export default WidgetPreview;
