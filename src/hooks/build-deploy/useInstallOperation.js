import * as R from "ramda";
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { hasItems } from "../../utils";
import { filterWidgetsBySelectedIds } from "../../utils/data-processing/widgetFiltering";

/**
 * Install operation hook
 * Handles dependency installation for selected widgets
 *
 * @param {Object} params - Hook parameters
 * @param {string} params.packageManager - Current package manager
 * @param {function} params.setIsInstalling - Loading state setter
 */
export function useInstallOperation({ packageManager, setIsInstalling }) {
  const handleInstall = useCallback(
    async ({ selectedWidgets, widgets }) => {
      if (!hasItems(selectedWidgets)) {
        alert("Please select at least one widget to install");
        return;
      }

      setIsInstalling(true);

      const selectedIds = Array.from(selectedWidgets);
      const widgetsList = await filterWidgetsBySelectedIds(widgets, selectedIds);

      const createInstallOperation = R.curry((widget) =>
        R.tryCatch(
          async () => {
            await invoke("run_package_manager_command", {
              packageManager,
              command: "install",
              workingDirectory: R.prop("path", widget),
            });
            return R.assoc("success", true, widget);
          },
          (error) => {
            alert(
              `Failed to install dependencies for ${R.prop("caption", widget)}: ${error}`,
            );
            return R.assoc("success", false, widget);
          },
        )(),
      );

      const executeInstallations = R.pipe(
        R.map(createInstallOperation),
        (promises) => Promise.all(promises),
      );

      await executeInstallations(widgetsList);

      setIsInstalling(false);
    },
    [packageManager, setIsInstalling],
  );

  return { handleInstall };
}
