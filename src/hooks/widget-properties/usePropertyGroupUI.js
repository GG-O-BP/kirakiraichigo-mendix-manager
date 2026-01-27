import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function usePropertyGroupUI(widgetDefinition) {
  const [expandedGroups, setExpandedGroups] = useState({});

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
            setExpandedGroups(initialState);
          } catch (error) {
            console.error("Failed to build initial expanded state:", error);
          }
        },
      )(widgetDefinition);
    };
    initializeExpandedGroups();
  }, [widgetDefinition]);

  const toggleGroup = useCallback(async (category) => {
    try {
      const result = await invoke("toggle_group_expansion", {
        expandedGroups,
        groupCaption: category,
      });
      setExpandedGroups(result);
    } catch (error) {
      console.error("Failed to toggle group expansion:", error);
      setExpandedGroups((prev) => ({
        ...prev,
        [category]: !R.propOr(true, category, prev),
      }));
    }
  }, [expandedGroups]);

  return {
    expandedGroups,
    toggleGroup,
  };
}
