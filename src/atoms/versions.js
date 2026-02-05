import * as R from "ramda";
import { atom } from "jotai";

// ===== Installed Filtered Versions Atom =====
export const installedFilteredVersionsAtom = atom([]);

// ===== Version Filters Atoms =====
export const versionSearchTermAtom = atom("");
export const appSearchTermAtom = atom("");
export const showOnlyDownloadableVersionsAtom = atom(false);
export const showLTSOnlyAtom = atom(false);
export const showMTSOnlyAtom = atom(false);
export const showBetaOnlyAtom = atom(false);

// ===== Version Selection Atom =====
export const selectedVersionAtom = atom(null);

// ===== Version Loading States Atom =====
export const versionLoadingStatesAtom = atom({});

// ===== Derived Atoms =====
export const versionFiltersAtom = atom((get) => ({
  searchTerm: get(versionSearchTermAtom),
  appSearchTerm: get(appSearchTermAtom),
  showOnlyDownloadableVersions: get(showOnlyDownloadableVersionsAtom),
  showLTSOnly: get(showLTSOnlyAtom),
  showMTSOnly: get(showMTSOnlyAtom),
  showBetaOnly: get(showBetaOnlyAtom),
}));

// ===== Action Atoms =====
export const toggleVersionSelectionAtom = atom(null, (get, set, version) => {
  const prevSelected = get(selectedVersionAtom);

  const newSelection = R.ifElse(
    R.both(
      R.complement(R.isNil),
      R.propEq(R.prop("version", version), "version"),
    ),
    R.always(null),
    R.always(version),
  )(prevSelected);

  set(selectedVersionAtom, newSelection);
});

export const resetVersionFiltersAtom = atom(null, (get, set) => {
  set(versionSearchTermAtom, "");
  set(showOnlyDownloadableVersionsAtom, false);
  set(showLTSOnlyAtom, false);
  set(showMTSOnlyAtom, false);
  set(showBetaOnlyAtom, false);
});

// ===== Loading State Helper Atoms =====
export const getLoadingStateSyncAtom = atom((get) => (versionId) => {
  const states = get(versionLoadingStatesAtom);
  const state = R.prop(versionId, states);
  const noActiveOperations = { isLaunching: false, isUninstalling: false, isDownloading: false };

  if (!state) return noActiveOperations;

  const isActiveOperation = (operationType) =>
    R.and(R.propEq(operationType, "operation", state), R.prop("value", state));

  return {
    isLaunching: isActiveOperation("launch"),
    isUninstalling: isActiveOperation("uninstall"),
    isDownloading: isActiveOperation("download"),
  };
});

export const isVersionBusyAtom = atom((get) => (versionId) => {
  const getLoadingStateSync = get(getLoadingStateSyncAtom);
  const loadingState = getLoadingStateSync(versionId);
  return R.either(R.prop("isLaunching"), R.prop("isUninstalling"))(loadingState);
});
