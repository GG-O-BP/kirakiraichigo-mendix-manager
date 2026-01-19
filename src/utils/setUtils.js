import * as R from "ramda";

export const arrayToSet = (arr) => new Set(arr);

export const hasItems = R.pipe(R.prop("size"), R.gt(R.__, 0));

export const setProperty = R.curry((propertyName, value, obj) =>
  R.set(R.lensProp(propertyName), value, obj),
);
