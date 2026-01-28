import { useCallback, useMemo } from "react";
import * as v from "valibot";
import * as R from "ramda";

export function useFieldValidation(schema) {
  const validate = useCallback(
    (value) => {
      const result = v.safeParse(schema, value);

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
    [schema],
  );

  return { validate };
}

export function useFormValidation(schema) {
  const validate = useCallback(
    (data) => {
      const result = v.safeParse(schema, data);

      return R.ifElse(
        R.prop("success"),
        R.always({ isValid: true, errors: {} }),
        R.pipe(
          R.prop("issues"),
          R.reduce(
            (acc, issue) =>
              R.assocPath(
                ["errors", R.path(["path", 0, "key"], issue)],
                R.prop("message", issue),
                acc,
              ),
            { isValid: false, errors: {} },
          ),
        ),
      )(result);
    },
    [schema],
  );

  const isValid = useCallback(
    (data) => R.prop("success", v.safeParse(schema, data)),
    [schema],
  );

  return { validate, isValid };
}

export function useDynamicSchema(getSchema, dependencies) {
  const schema = useMemo(
    () => getSchema(),
    dependencies,
  );

  return useFieldValidation(schema);
}
