import {
  useHooksInitializer,
  useDataLoader,
  useWrappedBuildDeployHandlers,
} from "./app-initialization";

export function useAppInitialization() {
  const {
    theme,
    versions,
    appsHook,
    widgetsHook,
    widgetPreviewHook,
    buildDeploy,
    modals,
  } = useHooksInitializer();

  useDataLoader({ versions, appsHook, widgetsHook });

  const wrappedHandlers = useWrappedBuildDeployHandlers({
    buildDeploy,
    widgetsHook,
    appsHook,
  });

  return {
    theme,
    versions,
    appsHook,
    widgetsHook,
    widgetPreviewHook,
    buildDeploy: {
      ...buildDeploy,
      ...wrappedHandlers,
    },
    modals,
  };
}
