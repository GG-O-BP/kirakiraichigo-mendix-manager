import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { wrapAsync } from "../../utils";
import { filterMendixVersions } from "../../utils/data-processing/versionFiltering";

export function useInstalledVersions(searchTerm = "") {
  const [versions, setVersions] = useState([]);
  const [filteredVersions, setFilteredVersions] = useState([]);

  const loadVersions = useCallback(
    wrapAsync(
      (error) => console.error("Failed to load versions:", error),
      R.pipeWith(R.andThen, [
        () => invoke("get_installed_mendix_versions"),
        setVersions,
      ]),
    ),
    [],
  );

  useEffect(() => {
    const processVersions = async () => {
      try {
        const term = R.defaultTo(null, searchTerm);
        const filtered = await filterMendixVersions(versions, term, true);
        setFilteredVersions(filtered);
      } catch (error) {
        console.error("Failed to filter versions:", error);
        setFilteredVersions(versions);
      }
    };

    R.ifElse(
      R.complement(R.isEmpty),
      processVersions,
      () => setFilteredVersions([]),
    )(versions);
  }, [versions, searchTerm]);

  return {
    versions,
    filteredVersions,
    loadVersions,
  };
}

export default useInstalledVersions;
