import * as v from "valibot";
import * as R from "ramda";

const nonEmptyString = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1),
);

export const addWidgetSchema = v.object({
  caption: v.pipe(nonEmptyString, v.description("Widget caption is required")),
  path: v.pipe(nonEmptyString, v.description("Widget path is required")),
});

export const validateAddWidgetForm = (data) => {
  const result = v.safeParse(addWidgetSchema, data);

  return R.ifElse(
    R.prop("success"),
    R.always({
      isValid: true,
      errors: {},
    }),
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
};
