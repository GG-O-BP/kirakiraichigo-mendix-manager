import * as R from "ramda";
import { useAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { isInstallingAtom } from "../../atoms";

const executeInstall = async ({ selectedWidgets, widgets, packageManager }) => {
  const hasSelection = await invoke("collection_has_items", {
    items: Array.from(selectedWidgets),
  });

  if (!hasSelection) {
    throw new Error("Please select at least one widget to install");
  }

  const selectedWidgetIds = Array.from(selectedWidgets);

  const summary = await invoke("batch_install_widgets", {
    widgets,
    packageManager,
    selectedWidgetIds,
  });

  R.unless(
    R.isEmpty,
    R.pipe(R.join(", "), (failedWidgets) => {
      throw new Error(`Failed to install dependencies for: ${failedWidgets}`);
    }),
  )(R.prop("failed_widget_names", summary));

  return summary;
};

export function useInstallOperation({ packageManager }) {
  const [isInstalling, setIsInstalling] = useAtom(isInstallingAtom);

  const handleInstall = async ({ selectedWidgets, widgets }) => {
    setIsInstalling(true);
    try {
      await executeInstall({ selectedWidgets, widgets, packageManager });
    } catch (err) {
      alert(err.message || `Installation failed: ${err}`);
    } finally {
      setIsInstalling(false);
    }
  };

  return {
    handleInstall,
    isInstalling,
  };
}
