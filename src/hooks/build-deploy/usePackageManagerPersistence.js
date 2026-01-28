import { useCallback } from "react";
import { useAtom } from "jotai";
import useSWR from "swr";
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from "../../utils";
import { packageManagerAtom } from "../../atoms";

const fetchPackageManager = () => loadFromStorage(STORAGE_KEYS.PACKAGE_MANAGER, "npm");

export function usePackageManagerPersistence() {
  const [packageManager, setPackageManagerAtom] = useAtom(packageManagerAtom);

  useSWR("package-manager", fetchPackageManager, {
    onSuccess: setPackageManagerAtom,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const setPackageManager = useCallback(
    async (value) => {
      setPackageManagerAtom(value);
      try {
        await saveToStorage(STORAGE_KEYS.PACKAGE_MANAGER, value);
      } catch (error) {
        console.error("Failed to save package manager:", error);
      }
    },
    [setPackageManagerAtom],
  );

  return {
    packageManager,
    setPackageManager,
  };
}
