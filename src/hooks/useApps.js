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

  const handleAppClick = useCallback(
    R.pipe(R.prop("path"), (appPath) => {
      setSelectedApps((prev) => {
        const currentSet = new Set(prev);
        const newSet = new Set(currentSet);

        if (currentSet.has(appPath)) {
          newSet.delete(appPath);
        } else {
          newSet.add(appPath);
        }

        const newArray = Array.from(newSet);

        saveToStorage(STORAGE_KEYS.SELECTED_APPS, newArray).catch(
          console.error,
        );

        return newSet;
      });
    }),
    [],
  );

  useEffect(() => {
    const processApps = async () => {
      try {
        const targetVersion = versionFilter === "all" ? null : versionFilter;
        const filtered = await filterMendixApps(
          apps,
          appSearchTerm || null,
          targetVersion,
          true,
        );
        setFilteredApps(filtered);
        setHasMore(filtered.length > ITEMS_PER_PAGE);
        setCurrentPage(1);
      } catch (error) {
        console.error("Failed to filter apps:", error);
        setFilteredApps(apps);
      }
    };

    if (apps && apps.length > 0) {
      processApps();
    } else {
      setFilteredApps([]);
    }
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
    currentPage,
    setCurrentPage,
    hasMore,
  };
}

export default useApps;
