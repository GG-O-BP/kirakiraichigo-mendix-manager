import { memo } from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  useAppContext,
  useWidgetCollectionContext,
  useWidgetFormContext,
  useBuildDeployContext,
  useVersionsContext,
} from "../../../contexts";
import { useDistExistsCheck } from "../../../hooks/build-deploy";
import {
  showWidgetModalAtom,
  showAddWidgetFormAtom,
  openWidgetDeleteModalAtom,
  openAppDeleteModalAtom,
} from "../../../atoms";
import AppsSelectionPanel from "./AppsSelectionPanel";
import WidgetsSelectionPanel from "./WidgetsSelectionPanel";
import BuildDeploySection from "./BuildDeploySection";

const WidgetManager = memo(() => {
  const appContext = useAppContext();
  const widgetCollectionContext = useWidgetCollectionContext();
  const widgetFormContext = useWidgetFormContext();
  const buildDeployContext = useBuildDeployContext();
  const { versions } = useVersionsContext();

  const {
    filteredApps,
    selectedApps,
    appSearchTerm,
    setAppSearchTerm,
    versionFilter,
    setVersionFilter,
    handleAppClick,
    isAppSelected,
  } = appContext;

  const {
    widgets,
    setWidgets,
    filteredWidgets,
    selectedWidgets,
    setSelectedWidgets,
    widgetSearchTerm,
    setWidgetSearchTerm,
    toggleWidgetSelection,
    isWidgetSelected,
  } = widgetCollectionContext;

  const { setNewWidgetCaption, setNewWidgetPath } = widgetFormContext;

  const {
    packageManager,
    setPackageManager,
    handleInstall,
    handleBuildDeploy,
    handleDeployOnly,
    isInstalling,
    isBuilding,
    isDeploying,
    inlineResults,
    setInlineResults,
    lastOperationType,
  } = buildDeployContext;

  const { allDistExist } = useDistExistsCheck({ selectedWidgets, widgets });

  const [, setShowWidgetModal] = useAtom(showWidgetModalAtom);
  const [, setShowAddWidgetForm] = useAtom(showAddWidgetFormAtom);
  const handleWidgetDeleteClick = useSetAtom(openWidgetDeleteModalAtom);
  const openAppDeleteModal = useSetAtom(openAppDeleteModalAtom);

  const modalHandlers = {
    setShowWidgetModal,
    setShowAddWidgetForm,
    setNewWidgetCaption,
    setNewWidgetPath,
  };

  return (
    <div className="base-manager widget-manager">
      <AppsSelectionPanel
        versions={versions}
        filteredApps={filteredApps}
        selectedApps={selectedApps}
        appSearchTerm={appSearchTerm}
        setAppSearchTerm={setAppSearchTerm}
        versionFilter={versionFilter}
        setVersionFilter={setVersionFilter}
        handleAppClick={handleAppClick}
        onDeleteApp={openAppDeleteModal}
        isAppSelected={isAppSelected}
      />
      <WidgetsSelectionPanel
        widgets={widgets}
        setWidgets={setWidgets}
        filteredWidgets={filteredWidgets}
        selectedWidgets={selectedWidgets}
        widgetSearchTerm={widgetSearchTerm}
        setWidgetSearchTerm={setWidgetSearchTerm}
        handleWidgetDeleteClick={handleWidgetDeleteClick}
        modalHandlers={modalHandlers}
        toggleWidgetSelection={toggleWidgetSelection}
        isWidgetSelected={isWidgetSelected}
      />
      <BuildDeploySection
        packageManager={packageManager}
        setPackageManager={setPackageManager}
        handleInstall={handleInstall}
        handleBuildDeploy={handleBuildDeploy}
        handleDeployOnly={handleDeployOnly}
        isInstalling={isInstalling}
        isBuilding={isBuilding}
        isDeploying={isDeploying}
        selectedWidgets={selectedWidgets}
        selectedApps={selectedApps}
        inlineResults={inlineResults}
        setInlineResults={setInlineResults}
        allDistExist={allDistExist}
        lastOperationType={lastOperationType}
      />
    </div>
  );
});

WidgetManager.displayName = "WidgetManager";

export default WidgetManager;
