import * as R from "ramda";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";
import { SWR_KEYS } from "../../lib/swr";
import { filterMendixVersions } from "../../utils/data-processing/versionFiltering";

const fetchInstalledVersions = () => invoke("get_installed_mendix_versions");

export function useInstalledVersions(searchTerm = "") {
  const [filteredVersions, setFilteredVersions] = useState([]);

  const {
    data: versions = [],
    isLoading,
    mutate,
  } = useSWR(SWR_KEYS.INSTALLED_VERSIONS, fetchInstalledVersions);

  useEffect(() => {
    const processVersions = async () => {
      try {
        const term = R.defaultTo(null, searchTerm);
        const filtered = await filterMendixVersions(versions, term, true);
        setFilteredVersions(filtered);
      } catch (err) {
        console.error("Failed to filter versions:", err);
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
    loadVersions: mutate,
    isLoading,
  };
}
