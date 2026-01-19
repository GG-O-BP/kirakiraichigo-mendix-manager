import * as R from "ramda";
import { useState, useCallback } from "react";

/**
 * useVersionSelection - Pure selection state management for versions
 * Manages single version selection with toggle behavior
 */
export function useVersionSelection() {
  const [selectedVersion, setSelectedVersion] = useState(null);

  const handleVersionClick = useCallback((version) => {
    setSelectedVersion((prevSelected) =>
      R.ifElse(
        R.both(
          R.complement(R.isNil),
          R.propEq(R.prop("version", version), "version"),
        ),
        R.always(null),
        R.always(version),
      )(prevSelected),
    );
  }, []);

  return {
    selectedVersion,
    setSelectedVersion,
    handleVersionClick,
  };
}

export default useVersionSelection;
