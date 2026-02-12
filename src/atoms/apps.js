import * as R from "ramda";
import { atom } from "jotai";

// ===== App Version Filter Atoms =====
export const appVersionFilterAtom = atom("all");

// ===== Derived Atoms =====
export const targetVersionAtom = atom((get) =>
  R.ifElse(R.equals("all"), R.always(null), R.identity)(get(appVersionFilterAtom)),
);
