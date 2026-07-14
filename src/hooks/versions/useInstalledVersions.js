import * as R from "ramda";
import { useEffect } from "react";
import { useAtom } from "jotai";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";
import { SWR_KEYS } from "../../lib/swr";
import { installedFilteredVersionsAtom } from "../../atoms/versions";
import { filterMendixVersions } from "../../utils/data-processing/versionFiltering";

const fetchInstalledVersions = () => invoke("get_installed_mendix_versions");

export function useInstalledVersions(searchTerm = "") {
  const [filteredVersions, setFilteredVersions] = useAtom(installedFilteredVersionsAtom);

  const {
    data: versions = [],
    isLoading,
    mutate,
  } = useSWR(SWR_KEYS.INSTALLED_VERSIONS, fetchInstalledVersions);

  useEffect(() => {
    const processVersions = () =>
      R.pipe(
        () => filterMendixVersions(versions, R.defaultTo(null, searchTerm), true),
        R.andThen(setFilteredVersions),
        R.otherwise(
          R.pipe(
            R.tap((err) => console.error("Failed to filter versions:", err)),
            () => setFilteredVersions(versions),
          ),
        ),
      )();

    R.ifElse(
      R.isNotEmpty,
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
