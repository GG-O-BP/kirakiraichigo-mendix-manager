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
    const initializeExpandedGroups = async () => {
      R.when(
        R.complement(R.isNil),
        async (definition) => {
          try {
            const propertyGroups = R.propOr([], "propertyGroups", definition);
            const initialState = await invoke("build_initial_expanded_state", {
              propertyGroups: R.map(
                (group) => ({ caption: R.prop("caption", group) }),
                propertyGroups,
              ),
            });
            initializeAction(initialState);
          } catch (error) {
            console.error("Failed to build initial expanded state:", error);
          }
        },
      )(widgetDefinition);
    };
    initializeExpandedGroups();
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
