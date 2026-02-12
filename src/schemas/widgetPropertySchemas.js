import * as v from "valibot";
import * as R from "ramda";

const parseIntegerValue = R.cond([
  [R.either(R.equals(""), R.isNil), R.always(null)],
  [R.T, (val) => parseInt(val, 10)],
]);

const parseDecimalValue = R.cond([
  [R.either(R.equals(""), R.isNil), R.always(null)],
  [R.T, (val) => parseFloat(val)],
]);

const isValidParsedNumber = R.either(R.isNil, R.complement(isNaN));

const integerSchema = v.pipe(
  v.union([v.string(), v.number(), v.null(), v.undefined()]),
  v.transform(parseIntegerValue),
  v.check(isValidParsedNumber, "Must be a valid integer"),
);

const decimalSchema = v.pipe(
  v.union([v.string(), v.number(), v.null(), v.undefined()]),
  v.transform(parseDecimalValue),
  v.check(isValidParsedNumber, "Must be a valid decimal number"),
);

const createEnumerationSchema = (options) =>
  v.pipe(
    v.optional(v.union([v.string(), v.null(), v.undefined()])),
    v.check(
      R.either(
        R.either(R.equals(""), R.isNil),
        R.includes(R.__, options),
      ),
      "Must be one of the available options",
    ),
  );

const tryParseJson = R.tryCatch(
  R.pipe(JSON.parse, R.always(true)),
  R.always(false),
);

const isValidJsonString = R.either(
  R.either(R.isNil, R.isEmpty),
  tryParseJson,
);

const jsonSchema = v.pipe(
  v.optional(v.union([v.string(), v.null(), v.undefined()])),
  v.check(isValidJsonString, "Invalid JSON format"),
);

const schemaByType = {
  integer: integerSchema,
  decimal: decimalSchema,
};

const getSchemaForType = (type, property) =>
  R.cond([
    [R.equals("enumeration"), () => createEnumerationSchema(R.propOr([], "options", property))],
    [R.has(R.__, schemaByType), R.prop(R.__, schemaByType)],
    [R.T, R.always(null)],
  ])(type);

export const validatePropertyValue = (property, value) => {
  const type = R.prop("type", property);
  const schema = getSchemaForType(type, property);

  return R.ifElse(
    R.isNil,
    R.always({ isValid: true, error: null }),
    (s) => {
      const result = v.safeParse(s, value);
      return R.ifElse(
        R.prop("success"),
        R.always({ isValid: true, error: null }),
        R.pipe(
          R.path(["issues", 0, "message"]),
          R.objOf("error"),
          R.assoc("isValid", false),
        ),
      )(result);
    },
  )(schema);
};

export const validateJson = (value) => {
  const result = v.safeParse(jsonSchema, value);
  return R.prop("success", result);
};
