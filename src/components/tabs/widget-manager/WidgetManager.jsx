import * as R from "ramda";
import { memo } from "react";
import { useAppContext, useWidgetContext, useBuildDeployContext, useModalContext } from "../../../contexts";
import AppsSelectionPanel from "./AppsSelectionPanel";
import WidgetsSelectionPanel from "./WidgetsSelectionPanel";
import BuildDeploySection from "./BuildDeploySection";

const WidgetManager = memo(({ versions }) => {
  const appContext = useAppContext();
  const widgetContext = useWidgetContext();
  const buildDeployContext = useBuildDeployContext();
  const modalContext = useModalContext();

  const {
    filteredApps,
    selectedApps,
    appSearchTerm,
    setAppSearchTerm,
    versionFilter,
    setVersionFilter,
    handleAppClick,
  } = appContext;

  const {
    widgets,
    setWidgets,
    filteredWidgets,
    selectedWidgets,
    setSelectedWidgets,
    widgetSearchTerm,
    setWidgetSearchTerm,
    setNewWidgetCaption,
    setNewWidgetPath,
  } = widgetContext;

  const {
    packageManager,
    setPackageManager,
    handleInstall,
    handleBuildDeploy,
    isInstalling,
    isBuilding,
    inlineResults,
    setInlineResults,
  } = buildDeployContext;

  const {
    setShowWidgetModal,
    setShowAddWidgetForm,
    handleWidgetDeleteClick,
  } = modalContext;

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
      />
      <WidgetsSelectionPanel
        widgets={widgets}
        setWidgets={setWidgets}
        filteredWidgets={filteredWidgets}
        selectedWidgets={selectedWidgets}
        setSelectedWidgets={setSelectedWidgets}
        widgetSearchTerm={widgetSearchTerm}
        setWidgetSearchTerm={setWidgetSearchTerm}
        handleWidgetDeleteClick={handleWidgetDeleteClick}
        modalHandlers={modalHandlers}
      />
      <BuildDeploySection
        packageManager={packageManager}
        setPackageManager={setPackageManager}
        handleInstall={handleInstall}
        handleBuildDeploy={handleBuildDeploy}
        isInstalling={isInstalling}
        isBuilding={isBuilding}
        selectedWidgets={selectedWidgets}
        selectedApps={selectedApps}
        inlineResults={inlineResults}
        setInlineResults={setInlineResults}
      />
    </div>
  );
});

WidgetManager.displayName = "WidgetManager";

export default WidgetManager;
