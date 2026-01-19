import * as R from "ramda";

// Extract value from input event target
export const getEventValue = R.path(["target", "value"]);

// Extract checked state from checkbox event target
export const getEventChecked = R.path(["target", "checked"]);

// Create a simple change handler that extracts value and passes to callback
export const createChangeHandler = R.curry((onChange, event) =>
  R.pipe(getEventValue, onChange)(event),
);

// Create a typed change handler for different input types (string, integer, decimal, boolean, enumeration)
export const createTypedChangeHandler = R.curry((onChange, type, event) => {
  const rawValue = getEventValue(event);

  const parseIntegerOrEmpty = (value) =>
    value === "" ? "" : parseInt(value, 10);

  const parseDecimalOrEmpty = (value) =>
    value === "" ? "" : parseFloat(value);

  const value = R.cond([
    [R.equals("boolean"), R.always(getEventChecked(event))],
    [R.equals("integer"), R.always(parseIntegerOrEmpty(rawValue))],
    [R.equals("decimal"), R.always(parseDecimalOrEmpty(rawValue))],
    [R.T, R.always(rawValue)],
  ])(type);

  return onChange(value);
});
