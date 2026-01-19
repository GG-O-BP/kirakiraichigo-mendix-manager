import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { STORAGE_KEYS, ITEMS_PER_PAGE, wrapAsync } from "../utils";
import { filterMendixApps } from "../utils/data-processing/appFiltering";
import { useCollection } from "./useCollection";

export function useApps() {
  const collection = useCollection({
    selectionStorageKey: STORAGE_KEYS.SELECTED_APPS,
    getItemId: R.prop("path"),
  });

  const [versionFilter, setVersionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadApps = useCallback(
    wrapAsync(
      (error) => console.error("Failed to load apps:", error),
      R.pipeWith(R.andThen, [
        () => invoke("get_installed_mendix_apps"),
        collection.setItems,
      ]),
    ),
    [collection.setItems],
  );

  const handleAppClick = useCallback(
    R.pipe(collection.toggleSelection),
    [collection.toggleSelection],
  );

  const handleDeleteApp = useCallback(
    async (appPath) => {
      try {
        await invoke("delete_mendix_app", { appPath });
        await loadApps();

        collection.removeFromSelection({ path: appPath });
        return true;
      } catch (error) {
        console.error("Failed to delete app:", error);
        throw error;
      }
    },
    [loadApps, collection.removeFromSelection],
  );

  // Filter apps effect
  useEffect(() => {
    const processApps = async () => {
      try {
        const targetVersion = R.ifElse(
          R.equals("all"),
          R.always(null),
          R.identity,
        )(versionFilter);
        const searchTerm = R.defaultTo(null, collection.searchTerm);
        const filtered = await filterMendixApps(
          collection.items,
          searchTerm,
          targetVersion,
          true,
        );
        collection.setFilteredItems(filtered);
        setHasMore(R.gt(R.length(filtered), ITEMS_PER_PAGE));
        setCurrentPage(1);
      } catch (error) {
        console.error("Failed to filter apps:", error);
        collection.setFilteredItems(collection.items);
      }
    };

    R.ifElse(
      R.complement(R.isEmpty),
      processApps,
      () => collection.setFilteredItems([]),
    )(collection.items);
  }, [collection.items, versionFilter, collection.searchTerm]);

  return {
    apps: collection.items,
    setApps: collection.setItems,
    filteredApps: collection.filteredItems,
    loadApps,
    appSearchTerm: collection.searchTerm,
    setAppSearchTerm: collection.setSearchTerm,
    versionFilter,
    setVersionFilter,
    selectedApps: collection.selectedItems,
    setSelectedApps: collection.setSelectedItems,
    handleAppClick,
    handleDeleteApp,
    currentPage,
    setCurrentPage,
    hasMore,
  };
}

export default useApps;
