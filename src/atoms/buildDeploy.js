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

