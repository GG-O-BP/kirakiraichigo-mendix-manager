import * as R from "ramda";

const extractEventValue = R.path(["target", "value"]);
const extractEventChecked = R.path(["target", "checked"]);

const parseIntegerOrEmpty = (value) => (value === "" ? "" : parseInt(value, 10));
const parseDecimalOrEmpty = (value) => (value === "" ? "" : parseFloat(value));

export const createChangeHandler = R.curry((onChange, event) =>
  R.pipe(extractEventValue, onChange)(event),
);

const parseValueByType = R.curry((event, rawValue, type) =>
  R.cond([
    [R.equals("boolean"), R.always(extractEventChecked(event))],
    [R.equals("integer"), R.always(parseIntegerOrEmpty(rawValue))],
    [R.equals("decimal"), R.always(parseDecimalOrEmpty(rawValue))],
    [R.T, R.always(rawValue)],
  ])(type),
);

export const createTypedChangeHandler = R.curry((onChange, type, event) => {
  const rawValue = extractEventValue(event);
  const parsedValue = parseValueByType(event, rawValue, type);
  return onChange(parsedValue);
});
