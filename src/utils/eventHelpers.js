import * as R from "ramda";
import { invoke } from "@tauri-apps/api/core";

const extractEventValue = R.path(["target", "value"]);
const extractEventChecked = R.path(["target", "checked"]);

export const invokeParseIntegerOrEmpty = (value) =>
  invoke("parse_integer_or_empty", { value: String(value) });

export const invokeParseDecimalOrEmpty = (value) =>
  invoke("parse_decimal_or_empty", { value: String(value) });

const parseValueByTypeAsync = async (event, rawValue, type) => {
  if (R.equals("boolean", type)) {
    return extractEventChecked(event);
  }
  if (R.equals("integer", type)) {
    return await invokeParseIntegerOrEmpty(rawValue);
  }
  if (R.equals("decimal", type)) {
    return await invokeParseDecimalOrEmpty(rawValue);
  }
  return rawValue;
};

export const createChangeHandler = R.curry((onChange, event) =>
  R.pipe(extractEventValue, onChange)(event),
);

export const createTypedChangeHandler = R.curry((onChange, type, event) => {
  const rawValue = extractEventValue(event);
  parseValueByTypeAsync(event, rawValue, type).then(onChange);
});
