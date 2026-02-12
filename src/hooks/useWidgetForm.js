import { useMemo } from "react";
import * as R from "ramda";
import { useAtom, useSetAtom } from "jotai";
import { validateAddWidgetForm } from "../schemas";
import {
  widgetCaptionAtom,
  widgetPathAtom,
  widgetFormTouchedAtom,
  widgetFormDataAtom,
  setCaptionWithTouchAtom,
  setPathWithTouchAtom,
  resetWidgetFormAtom,
  touchAllFieldsAtom,
} from "../atoms/widgetForm";

export function useWidgetForm() {
  const [newWidgetCaption] = useAtom(widgetCaptionAtom);
  const [newWidgetPath] = useAtom(widgetPathAtom);
  const [touched] = useAtom(widgetFormTouchedAtom);
  const [formData] = useAtom(widgetFormDataAtom);

  const setCaption = useSetAtom(setCaptionWithTouchAtom);
  const setPath = useSetAtom(setPathWithTouchAtom);
  const resetForm = useSetAtom(resetWidgetFormAtom);
  const touchAll = useSetAtom(touchAllFieldsAtom);

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
