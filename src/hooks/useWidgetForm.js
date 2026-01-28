import { useState, useCallback, useMemo } from "react";
import * as R from "ramda";
import { validateAddWidgetForm } from "../schemas";

export function useWidgetForm() {
  const [newWidgetCaption, setNewWidgetCaption] = useState("");
  const [newWidgetPath, setNewWidgetPath] = useState("");
  const [touched, setTouched] = useState({ caption: false, path: false });

  const formData = useMemo(
    () => ({ caption: newWidgetCaption, path: newWidgetPath }),
    [newWidgetCaption, newWidgetPath],
  );

  const validation = useMemo(
    () => validateAddWidgetForm(formData),
    [formData],
  );

  const isValid = R.prop("isValid", validation);

  const errors = useMemo(
    () =>
      R.pipe(
        R.toPairs,
        R.filter(([key]) => R.prop(key, touched)),
        R.fromPairs,
      )(R.propOr({}, "errors", validation)),
    [validation, touched],
  );

  const setCaption = useCallback((value) => {
    setNewWidgetCaption(value);
    setTouched((prev) => R.assoc("caption", true, prev));
  }, []);

  const setPath = useCallback((value) => {
    setNewWidgetPath(value);
    setTouched((prev) => R.assoc("path", true, prev));
  }, []);

  const resetForm = useCallback(() => {
    setNewWidgetCaption("");
    setNewWidgetPath("");
    setTouched({ caption: false, path: false });
  }, []);

  const touchAll = useCallback(() => {
    setTouched({ caption: true, path: true });
  }, []);

  return {
    newWidgetCaption,
    setNewWidgetCaption: setCaption,
    newWidgetPath,
    setNewWidgetPath: setPath,
    resetForm,
    isValid,
    errors,
    touchAll,
    validation,
  };
}
