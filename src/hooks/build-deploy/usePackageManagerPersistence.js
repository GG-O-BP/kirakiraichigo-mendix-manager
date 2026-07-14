import * as R from "ramda";
import { useCallback } from "react";
import { useAtom } from "jotai";
import useSWR from "swr";
import { SWR_KEYS } from "../../lib/swr";
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from "../../utils";
import { packageManagerAtom } from "../../atoms";

const fetchPackageManager = () => loadFromStorage(STORAGE_KEYS.PACKAGE_MANAGER, "npm");

export function usePackageManagerPersistence() {
  const [packageManager, setPackageManagerAtom] = useAtom(packageManagerAtom);

  useSWR(SWR_KEYS.PACKAGE_MANAGER, fetchPackageManager, {
    onSuccess: setPackageManagerAtom,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const setPackageManager = useCallback(
    (value) => {
      setPackageManagerAtom(value);
      return R.pipe(
        () => saveToStorage(STORAGE_KEYS.PACKAGE_MANAGER, value),
        R.otherwise((error) => console.error("Failed to save package manager:", error)),
      )();
    },
    [setPackageManagerAtom],
  );

  return {
    packageManager,
    setPackageManager,
  };
}
