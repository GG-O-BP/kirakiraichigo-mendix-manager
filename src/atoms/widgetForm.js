import * as R from "ramda";
import { atom } from "jotai";

// ===== Widget Form State Atoms =====
export const widgetCaptionAtom = atom("");
export const widgetPathAtom = atom("");
export const widgetFormTouchedAtom = atom({ caption: false, path: false });

// ===== Derived Atoms =====
export const widgetFormDataAtom = atom((get) => ({
  caption: get(widgetCaptionAtom),
  path: get(widgetPathAtom),
}));

// ===== Action Atoms =====
export const setCaptionWithTouchAtom = atom(null, (get, set, value) =>
  R.pipe(
    R.tap(() => set(widgetCaptionAtom, value)),
    R.tap(() => set(widgetFormTouchedAtom, (prev) => R.assoc("caption", true, prev))),
  )(null),
);

export const setPathWithTouchAtom = atom(null, (get, set, value) =>
  R.pipe(
    R.tap(() => set(widgetPathAtom, value)),
    R.tap(() => set(widgetFormTouchedAtom, (prev) => R.assoc("path", true, prev))),
  )(null),
);

export const resetWidgetFormAtom = atom(null, (get, set) =>
  R.pipe(
    R.tap(() => set(widgetCaptionAtom, "")),
    R.tap(() => set(widgetPathAtom, "")),
    R.tap(() => set(widgetFormTouchedAtom, { caption: false, path: false })),
  )(null),
);

export const touchAllFieldsAtom = atom(null, (get, set) =>
  set(widgetFormTouchedAtom, { caption: true, path: true }),
);
