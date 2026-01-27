import * as R from "ramda";
import useSWRMutation from "swr/mutation";
import { invoke } from "@tauri-apps/api/core";

const installWidgets = async (_, { arg }) => {
  const { selectedWidgets, widgets, packageManager } = arg;

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
  const { trigger, isMutating: isInstalling, error } = useSWRMutation(
    "install-widgets",
    installWidgets,
  );

  const handleInstall = async ({ selectedWidgets, widgets }) => {
    try {
      await trigger({ selectedWidgets, widgets, packageManager });
    } catch (err) {
      alert(err.message || `Installation failed: ${err}`);
    }
  };

  return {
    handleInstall,
    isInstalling,
    installError: error,
  };
}
