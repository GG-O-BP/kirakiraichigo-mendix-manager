import * as R from "ramda";

export const setProperty = R.curry((propertyName, value, obj) =>
  R.set(R.lensProp(propertyName), value, obj),
);
