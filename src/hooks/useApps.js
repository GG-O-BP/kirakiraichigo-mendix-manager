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
  const {
    items,
    setItems,
    filteredItems,
    setFilteredItems,
    searchTerm,
    setSearchTerm,
    selectedItems,
    setSelectedItems,
    toggleSelection,
    isSelected,
    removeFromSelection,
  } = useCollection({
    selectionType: "apps",
    getItemId: R.prop("path"),
  });

  const [versionFilter, setVersionFilter] = useAtom(appVersionFilterAtom);
  const [targetVersion] = useAtom(targetVersionAtom);

  const { isLoading, mutate } = useSWR(SWR_KEYS.APPS, fetchInstalledApps, {
    onSuccess: setItems,
  });

  const handleAppClick = useCallback(toggleSelection, [toggleSelection]);

  const handleDeleteApp = useCallback(
    (appPath) =>
      R.pipe(
        () => invoke("delete_mendix_app", { appPath }),
        R.andThen(() => mutate()),
        R.andThen(
          R.pipe(
            R.tap(() => removeFromSelection({ path: appPath })),
            R.always(true),
          ),
        ),
        R.otherwise((err) => {
          console.error("Failed to delete app:", err);
          throw err;
        }),
      )(),
    [mutate, removeFromSelection],
  );

  useEffect(() => {
    const processApps = () =>
      R.pipe(
        () =>
          processAppsPipeline(items, {
            searchTerm,
            targetVersion,
            onlyValid: true,
          }),
        R.andThen(setFilteredItems),
        R.otherwise(
          R.pipe(
            R.tap((err) => console.error("Failed to filter apps:", err)),
            () => setFilteredItems(items),
          ),
        ),
      )();

    R.ifElse(
      R.isNotEmpty,
      processApps,
      () => setFilteredItems([]),
    )(items);
  }, [items, targetVersion, searchTerm]);

  return {
    apps: items,
    setApps: setItems,
    filteredApps: filteredItems,
    loadApps: mutate,
    appSearchTerm: searchTerm,
    setAppSearchTerm: setSearchTerm,
    versionFilter,
    setVersionFilter,
    selectedApps: selectedItems,
    setSelectedApps: setSelectedItems,
    handleAppClick,
    handleDeleteApp,
    isAppSelected: isSelected,
    isLoading,
  };
}
