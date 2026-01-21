import * as R from "ramda";
import { useState, useCallback } from "react";

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
