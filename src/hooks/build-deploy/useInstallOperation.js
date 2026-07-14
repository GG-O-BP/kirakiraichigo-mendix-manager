import * as R from "ramda";
import { useAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { isInstallingAtom } from "../../atoms";

const executeInstall = ({ selectedWidgets, widgets, packageManager }) => {
  const selectedWidgetIds = Array.from(selectedWidgets);

  return R.pipe(
    () => invoke("collection_has_items", { items: selectedWidgetIds }),
    R.andThen(
      R.unless(R.identity, () => {
        throw new Error("Please select at least one widget to install");
      }),
    ),
    R.andThen(() =>
      invoke("batch_install_widgets", {
        widgets,
        packageManager,
        selectedWidgetIds,
      }),
    ),
    R.andThen(
      R.tap(
        R.pipe(
          R.prop("failed_widget_names"),
          R.unless(
            R.isEmpty,
            R.pipe(R.join(", "), (failedWidgets) => {
              throw new Error(`Failed to install dependencies for: ${failedWidgets}`);
            }),
          ),
        ),
      ),
    ),
  )();
};

export function useInstallOperation({ packageManager }) {
  const [isInstalling, setIsInstalling] = useAtom(isInstallingAtom);

  const handleInstall = ({ selectedWidgets, widgets }) => {
    setIsInstalling(true);
    return R.pipe(
      () => executeInstall({ selectedWidgets, widgets, packageManager }),
      R.otherwise((err) =>
        alert(
          R.pipe(
            R.propOr("", "message"),
            R.when(R.isEmpty, R.always(`Installation failed: ${err}`)),
          )(err),
        ),
      ),
      R.andThen(() => setIsInstalling(false)),
    )();
  };

  return {
    handleInstall,
    isInstalling,
  };
}
