import { useState, useEffect } from "react";
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from "../../utils";

export function usePackageManagerPersistence() {
  const [packageManager, setPackageManager] = useState("npm");

  useEffect(() => {
    const restorePackageManagerFromStorage = async () => {
      try {
        const savedPackageManager = await loadFromStorage(STORAGE_KEYS.PACKAGE_MANAGER, "npm");
        setPackageManager(savedPackageManager);
      } catch (error) {
        console.error("Failed to load package manager:", error);
      }
    };
    restorePackageManagerFromStorage();
  }, []);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PACKAGE_MANAGER, packageManager).catch(
      console.error,
    );
  }, [packageManager]);

  return {
    packageManager,
    setPackageManager,
  };
}
