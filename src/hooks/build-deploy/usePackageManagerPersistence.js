import { useState, useEffect } from "react";
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from "../../utils";

/**
 * Package manager persistence hook
 * Handles saving and loading package manager preference
 */
export function usePackageManagerPersistence() {
  const [packageManager, setPackageManager] = useState("npm");

  // Load saved package manager preference on mount
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

  // Persist package manager preference on change
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
