import * as R from "ramda";
import { invoke } from "@tauri-apps/api/core";

const extractEventValue = R.path(["target", "value"]);
const extractEventChecked = R.path(["target", "checked"]);

const invokeParseIntegerOrEmpty = (value) =>
  invoke("parse_integer_or_empty", { value: String(value) });

const invokeParseDecimalOrEmpty = (value) =>
  invoke("parse_decimal_or_empty", { value: String(value) });

const parseValueByTypeAsync = async (event, rawValue, type) =>
  R.cond([
    [R.equals("boolean"), () => extractEventChecked(event)],
    [R.equals("integer"), () => invokeParseIntegerOrEmpty(rawValue)],
    [R.equals("decimal"), () => invokeParseDecimalOrEmpty(rawValue)],
    [R.T, R.always(rawValue)],
  ])(type);

export const createChangeHandler = R.curry((onChange, event) =>
  R.pipe(extractEventValue, onChange)(event),
);

export const createTypedChangeHandler = R.curry((onChange, type, event) =>
  R.andThen(onChange, parseValueByTypeAsync(event, extractEventValue(event), type)),
);
