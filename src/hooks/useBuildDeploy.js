import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  STORAGE_KEYS,
  saveToStorage,
  loadFromStorage,
  hasItems,
  invokeValidateBuildDeploySelections,
  createCatastrophicErrorResult,
  invokeHasBuildFailures,
} from "../utils";
import { filterWidgetsBySelectedIds, filterAppsBySelectedPaths } from "../utils/dataProcessing";

/**
 * Build and deploy hook with parameter-based dependencies.
 * Instead of receiving external state at initialization, handlers accept parameters at call time.
 * This reduces coupling between hooks.
 *
 * @param {Object} options - Optional configuration
 * @param {function} options.onShowResultModal - Callback when result modal should be shown
 */
export function useBuildDeploy(options = {}) {
  const { onShowResultModal } = options;

  const [packageManager, setPackageManager] = useState("npm");
  const [isInstalling, setIsInstalling] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildResults, setBuildResults] = useState({
    successful: [],
    failed: [],
  });
  const [inlineResults, setInlineResults] = useState(null);
  const [isUninstalling, setIsUninstalling] = useState(false);

  /**
   * Install dependencies for selected widgets
   * @param {Object} params - Parameters object
   * @param {Set} params.selectedWidgets - Set of selected widget IDs
   * @param {Array} params.widgets - Array of all widgets
   */
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
    [packageManager],
  );

  /**
   * Build and deploy widgets to selected apps
   * @param {Object} params - Parameters object
   * @param {Set} params.selectedWidgets - Set of selected widget IDs
   * @param {Set} params.selectedApps - Set of selected app paths
   * @param {Array} params.widgets - Array of all widgets
   * @param {Array} params.apps - Array of all apps
   */
  const handleBuildDeploy = useCallback(
    async ({ selectedWidgets, selectedApps, widgets, apps }) => {
      const validationError = await invokeValidateBuildDeploySelections(
        selectedWidgets,
        selectedApps,
      );

      if (validationError) {
        alert(validationError);
        return;
      }

      const initializeBuildState = R.pipe(
        R.tap(() => onShowResultModal && onShowResultModal(false)),
        R.tap(() => setBuildResults({ successful: [], failed: [] })),
        R.tap(() => setIsBuilding(true)),
        R.always(null),
      );

      initializeBuildState();

      const selectedWidgetIds = Array.from(selectedWidgets);
      const selectedAppPaths = Array.from(selectedApps);

      const widgetsList = await filterWidgetsBySelectedIds(widgets, selectedWidgetIds);
      const appsList = await filterAppsBySelectedPaths(apps, selectedAppPaths);

      const executeBuildDeploy = R.tryCatch(
        async () =>
          await invoke("build_and_deploy_from_selections", {
            widgets: widgetsList,
            apps: appsList,
            packageManager,
          }),
        createCatastrophicErrorResult,
      );

      const results = await executeBuildDeploy();
      setBuildResults(results);
      setInlineResults(results);
      setIsBuilding(false);

      const hasFailures = await invokeHasBuildFailures(results);
      if (hasFailures && onShowResultModal) {
        onShowResultModal(true);
      }
    },
    [packageManager, onShowResultModal],
  );

  // Persist package manager preference
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PACKAGE_MANAGER, packageManager).catch(
      console.error,
    );
  }, [packageManager]);

  // Load saved package manager preference
  useEffect(() => {
    const loadPackageManager = async () => {
      try {
        const savedPackageManager = await loadFromStorage(STORAGE_KEYS.PACKAGE_MANAGER, "npm");
        setPackageManager(savedPackageManager);
      } catch (error) {
        console.error("Failed to load package manager:", error);
      }
    };
    loadPackageManager();
  }, []);

  return {
    packageManager,
    setPackageManager,
    isInstalling,
    handleInstall,
    isBuilding,
    handleBuildDeploy,
    buildResults,
    setBuildResults,
    inlineResults,
    setInlineResults,
    isUninstalling,
    setIsUninstalling,
  };
}

export default useBuildDeploy;
