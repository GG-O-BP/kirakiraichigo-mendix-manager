import * as R from "ramda";
import { useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";
import { SWR_KEYS } from "../lib/swr";
import { processAppsPipeline } from "../utils/data-processing/appFiltering";
import { useCollection } from "./useCollection";
import { appVersionFilterAtom, targetVersionAtom } from "../atoms/apps";

const fetchInstalledApps = () => invoke("get_installed_mendix_apps");

export function useApps() {
  const collection = useCollection({
    selectionType: "apps",
    getItemId: R.prop("path"),
  });

  const [versionFilter, setVersionFilter] = useAtom(appVersionFilterAtom);
  const [targetVersion] = useAtom(targetVersionAtom);

  const {
    data: apps = [],
    isLoading,
    mutate,
  } = useSWR(SWR_KEYS.APPS, fetchInstalledApps, {
    onSuccess: collection.setItems,
  });

  const handleAppClick = useCallback(
    collection.toggleSelection,
    [collection.toggleSelection],
  );

  const handleDeleteApp = useCallback(
    async (appPath) => {
      try {
        await invoke("delete_mendix_app", { appPath });
        await mutate();
        collection.removeFromSelection({ path: appPath });
        return true;
      } catch (err) {
        console.error("Failed to delete app:", err);
        throw err;
      }
    },
    [mutate, collection.removeFromSelection],
  );

  useEffect(() => {
    const processApps = async () => {
      try {
        const filtered = await processAppsPipeline(collection.items, {
          searchTerm: collection.searchTerm,
          targetVersion,
          onlyValid: true,
        });
        collection.setFilteredItems(filtered);
      } catch (err) {
        console.error("Failed to filter apps:", err);
        collection.setFilteredItems(collection.items);
      }
    };

    R.ifElse(
      R.complement(R.isEmpty),
      processApps,
      () => collection.setFilteredItems([]),
    )(collection.items);
  }, [collection.items, targetVersion, collection.searchTerm]);

  return {
    apps: collection.items,
    setApps: collection.setItems,
    filteredApps: collection.filteredItems,
    loadApps: mutate,
    appSearchTerm: collection.searchTerm,
    setAppSearchTerm: collection.setSearchTerm,
    versionFilter,
    setVersionFilter,
    selectedApps: collection.selectedItems,
    setSelectedApps: collection.setSelectedItems,
    handleAppClick,
    handleDeleteApp,
    isAppSelected: collection.isSelected,
    isLoading,
  };
}
