import * as R from "ramda";
import { useEffect, useCallback } from "react";
import { useAtom, useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import {
  expandedGroupsAtomFamily,
  toggleGroupAtomFamily,
  initializeExpandedGroupsAtomFamily,
} from "../../atoms/widgetPreview";

export function usePropertyGroupUI(widgetDefinition) {
  const widgetId = R.propOr("unknown", "id", widgetDefinition);

  const [expandedGroups] = useAtom(expandedGroupsAtomFamily(widgetId));
  const toggleGroupAction = useSetAtom(toggleGroupAtomFamily(widgetId));
  const initializeAction = useSetAtom(initializeExpandedGroupsAtomFamily(widgetId));

  useEffect(() => {
    R.when(
      R.isNotNil,
      (definition) =>
        R.pipe(
          () =>
            invoke("build_initial_expanded_state", {
              propertyGroups: R.map(
                (group) => ({ caption: R.prop("caption", group) }),
                R.propOr([], "propertyGroups", definition),
              ),
            }),
          R.andThen(initializeAction),
          R.otherwise((error) => console.error("Failed to build initial expanded state:", error)),
        )(),
    )(widgetDefinition);
  }, [widgetDefinition, initializeAction]);

  const toggleGroup = useCallback(
    (category) => {
      toggleGroupAction(category);
    },
    [toggleGroupAction],
  );

  return {
    expandedGroups,
    toggleGroup,
  };
}
