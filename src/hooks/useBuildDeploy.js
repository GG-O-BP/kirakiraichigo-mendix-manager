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
} from "../utils/functional";
import { filterWidgetsBySelectedIds, filterAppsBySelectedPaths } from "../utils/dataProcessing";

export function useBuildDeploy({
  selectedWidgets,
  selectedApps,
  widgets,
  apps,
  setShowResultModal,
}) {
  const [packageManager, setPackageManager] = useState("npm");
  const [isInstalling, setIsInstalling] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildResults, setBuildResults] = useState({
    successful: [],
    failed: [],
  });
  const [inlineResults, setInlineResults] = useState(null);
  const [isUninstalling, setIsUninstalling] = useState(false);

  const handleInstall = useCallback(async () => {
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
  }, [selectedWidgets, widgets, packageManager]);

  const handleBuildDeploy = useCallback(async () => {
    const validationError = await invokeValidateBuildDeploySelections(
      selectedWidgets,
      selectedApps,
    );

    if (validationError) {
      alert(validationError);
      return;
    }

    const initializeBuildState = R.pipe(
      R.tap(() => setShowResultModal && setShowResultModal(false)),
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
    if (hasFailures && setShowResultModal) {
      setShowResultModal(true);
    }
  }, [selectedWidgets, selectedApps, widgets, apps, packageManager, setShowResultModal]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PACKAGE_MANAGER, packageManager).catch(
      console.error,
    );
  }, [packageManager]);

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
