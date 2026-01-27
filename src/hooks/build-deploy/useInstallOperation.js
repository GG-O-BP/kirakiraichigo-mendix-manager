import * as R from "ramda";
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useInstallOperation({ packageManager, setIsInstalling }) {
  const handleInstall = useCallback(
    async ({ selectedWidgets, widgets }) => {
      try {
        const hasSelection = await invoke("collection_has_items", {
          items: Array.from(selectedWidgets),
        });

        if (!hasSelection) {
          alert("Please select at least one widget to install");
          return;
        }

        setIsInstalling(true);

        const selectedWidgetIds = Array.from(selectedWidgets);

        const summary = await invoke("batch_install_widgets", {
          widgets,
          packageManager,
          selectedWidgetIds,
        });

        R.unless(
          R.isEmpty,
          R.pipe(R.join(", "), (failedWidgets) =>
            alert(`Failed to install dependencies for: ${failedWidgets}`),
          ),
        )(R.prop("failed_widget_names", summary));
      } catch (error) {
        alert(`Installation failed: ${error}`);
      }

      setIsInstalling(false);
    },
    [packageManager, setIsInstalling],
  );

  return { handleInstall };
}
