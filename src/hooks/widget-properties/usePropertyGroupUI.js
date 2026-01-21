import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";

const buildInitialExpandedState = (widgetDefinition) => {
  const propertyGroups = R.propOr([], "propertyGroups", widgetDefinition);
  const firstGroupCaption = R.pipe(R.head, R.propOr(null, "caption"))(propertyGroups);

  return R.ifElse(
    R.isNil,
    R.always({}),
    (caption) => R.pipe(
      R.map((group) => [R.prop("caption", group), false]),
      R.fromPairs,
      R.assoc(caption, true),
    )(propertyGroups),
  )(firstGroupCaption);
};

export function usePropertyGroupUI(widgetDefinition) {
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    R.when(
      R.complement(R.isNil),
      R.pipe(buildInitialExpandedState, setExpandedGroups),
    )(widgetDefinition);
  }, [widgetDefinition]);

  const toggleGroup = useCallback((category) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [category]: !R.propOr(true, category, prev),
    }));
  }, []);

  return {
    expandedGroups,
    toggleGroup,
  };
}
