import { useEffect } from "react";

export function useDataLoader({ versions, appsHook, widgetsHook }) {
  useEffect(() => {
    versions.loadVersions();
    appsHook.loadApps();
    widgetsHook.loadWidgets();
  }, [versions.loadVersions, appsHook.loadApps, widgetsHook.loadWidgets]);
}
