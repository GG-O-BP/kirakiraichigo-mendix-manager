import { useCallback } from "react";

export function useWrappedBuildDeployHandlers({
  buildDeploy,
  widgetsHook,
  appsHook,
}) {
  const wrappedHandleInstall = useCallback(
    () =>
      buildDeploy.handleInstall({
        selectedWidgets: widgetsHook.selectedWidgets,
        widgets: widgetsHook.widgets,
      }),
    [buildDeploy.handleInstall, widgetsHook.selectedWidgets, widgetsHook.widgets],
  );

  const wrappedHandleBuildDeploy = useCallback(
    () =>
      buildDeploy.handleBuildDeploy({
        selectedWidgets: widgetsHook.selectedWidgets,
        selectedApps: appsHook.selectedApps,
        widgets: widgetsHook.widgets,
        apps: appsHook.apps,
      }),
    [
      buildDeploy.handleBuildDeploy,
      widgetsHook.selectedWidgets,
      appsHook.selectedApps,
      widgetsHook.widgets,
      appsHook.apps,
    ],
  );

  return {
    handleInstall: wrappedHandleInstall,
    handleBuildDeploy: wrappedHandleBuildDeploy,
  };
}
