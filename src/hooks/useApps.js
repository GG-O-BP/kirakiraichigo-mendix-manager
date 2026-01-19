import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  STORAGE_KEYS,
  ITEMS_PER_PAGE,
  wrapAsync,
  arrayToSet,
  saveToStorage,
  loadFromStorage,
} from "../utils/functional";
import { filterMendixApps } from "../utils/dataProcessing";

export function useApps() {
  const [apps, setApps] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [appSearchTerm, setAppSearchTerm] = useState("");
  const [versionFilter, setVersionFilter] = useState("all");
  const [selectedApps, setSelectedApps] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadApps = useCallback(
    wrapAsync(
      (error) => console.error("Failed to load apps:", error),
      R.pipeWith(R.andThen, [
        () => invoke("get_installed_mendix_apps"),
        setApps,
      ]),
    ),
    [],
  );

  const toggleSetItem = R.curry((item, set) => {
    const newSet = new Set(set);
    R.ifElse(
      () => newSet.has(item),
      () => newSet.delete(item),
      () => newSet.add(item),
    )();
    return newSet;
  });

  const handleAppClick = useCallback(
    R.pipe(R.prop("path"), (appPath) => {
      setSelectedApps((prev) => {
        const newSet = toggleSetItem(appPath, prev);
        const newArray = Array.from(newSet);
        saveToStorage(STORAGE_KEYS.SELECTED_APPS, newArray).catch(console.error);
        return newSet;
      });
    }),
    [],
  );

  const handleDeleteApp = useCallback(
    async (appPath) => {
      try {
        await invoke("delete_mendix_app", { appPath });
        await loadApps();

        setSelectedApps((prev) => {
          const newSet = new Set(prev);
          R.when(
            () => newSet.has(appPath),
            () => {
              newSet.delete(appPath);
              const selectedAppsArray = Array.from(newSet);
              saveToStorage(STORAGE_KEYS.SELECTED_APPS, selectedAppsArray).catch(console.error);
            },
          )();
          return newSet;
        });

        return true;
      } catch (error) {
        console.error("Failed to delete app:", error);
        throw error;
      }
    },
    [loadApps],
  );

  useEffect(() => {
    const processApps = async () => {
      try {
        const targetVersion = R.ifElse(
          R.equals("all"),
          R.always(null),
          R.identity,
        )(versionFilter);
        const searchTerm = R.defaultTo(null, appSearchTerm);
        const filtered = await filterMendixApps(apps, searchTerm, targetVersion, true);
        setFilteredApps(filtered);
        setHasMore(R.gt(R.length(filtered), ITEMS_PER_PAGE));
        setCurrentPage(1);
      } catch (error) {
        console.error("Failed to filter apps:", error);
        setFilteredApps(apps);
      }
    };

    R.ifElse(
      R.complement(R.isEmpty),
      processApps,
      () => setFilteredApps([]),
    )(apps);
  }, [apps, versionFilter, appSearchTerm]);

  useEffect(() => {
    const loadSelectedApps = async () => {
      try {
        const selectedAppsArray = await loadFromStorage(STORAGE_KEYS.SELECTED_APPS, []);
        setSelectedApps(arrayToSet(selectedAppsArray));
      } catch (error) {
        console.error("Failed to load selected apps:", error);
      }
    };
    loadSelectedApps();
  }, []);

  return {
    apps,
    setApps,
    filteredApps,
    loadApps,
    appSearchTerm,
    setAppSearchTerm,
    versionFilter,
    setVersionFilter,
    selectedApps,
    setSelectedApps,
    handleAppClick,
    handleDeleteApp,
    currentPage,
    setCurrentPage,
    hasMore,
  };
}

export default useApps;
