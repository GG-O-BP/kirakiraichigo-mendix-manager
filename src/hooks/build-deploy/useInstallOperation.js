import * as R from "ramda";
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { hasItems } from "../../utils";

/**
 * Install operation hook
 * Handles dependency installation for selected widgets using parallel Rust-based batch processing
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

      const selectedWidgetIds = Array.from(selectedWidgets);

      try {
        const results = await invoke("batch_install_widgets", {
          widgets,
          packageManager,
          selectedWidgetIds,
        });

        const failedResults = R.filter(R.propEq(false, "success"), results);

        R.unless(
          R.isEmpty,
          R.pipe(
            R.map(R.prop("widgetCaption")),
            R.join(", "),
            (failedWidgets) =>
              alert(`Failed to install dependencies for: ${failedWidgets}`),
          ),
        )(failedResults);
      } catch (error) {
        alert(`Installation failed: ${error}`);
      }

      setIsInstalling(false);
    },
    [packageManager, setIsInstalling],
  );

  return { handleInstall };
}
