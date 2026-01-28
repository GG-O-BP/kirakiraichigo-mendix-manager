import { atom } from "jotai";

// ===== Build Deploy State Atoms =====
export const buildResultsAtom = atom({
  successful: [],
  failed: [],
});

export const inlineResultsAtom = atom(null);

export const isUninstallingAtom = atom(false);

export const lastOperationTypeAtom = atom(null);

// ===== Package Manager Atom =====
export const packageManagerAtom = atom("npm");

// ===== Action Atoms =====
export const resetBuildResultsAtom = atom(null, (get, set) => {
  set(buildResultsAtom, { successful: [], failed: [] });
  set(inlineResultsAtom, null);
  set(lastOperationTypeAtom, null);
});

export const setBuildResultsWithInlineAtom = atom(null, (get, set, results) => {
  set(buildResultsAtom, results);
  set(inlineResultsAtom, results);
});
