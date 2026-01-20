import * as R from "ramda";
import { useState, useCallback } from "react";

/**
 * usePropertyGroupUI - Pure UI state management for property group expansion
 * Manages which property groups are expanded/collapsed
 */
export function usePropertyGroupUI() {
  const [expandedGroups, setExpandedGroups] = useState({});

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
