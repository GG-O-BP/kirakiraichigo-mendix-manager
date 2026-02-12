import { atom } from "jotai";
import { atomFamily } from "jotai-family";

// ===== Collection Items Atoms (per collection type) =====
export const itemsAtomFamily = atomFamily((collectionType) => atom([]));

// ===== Collection Selection Atoms (per selection type) =====
export const selectedItemsAtomFamily = atomFamily((selectionType) =>
  atom(new Set()),
);

// ===== Search Term Atoms (per collection type) =====
export const searchTermAtomFamily = atomFamily((collectionType) => atom(""));

// ===== Filtered Items Atoms (per collection type) =====
export const filteredItemsAtomFamily = atomFamily((collectionType) =>
  atom([]),
);
