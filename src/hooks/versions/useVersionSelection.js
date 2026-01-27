import * as R from "ramda";
import { useState, useCallback } from "react";

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
    handleVersionClick,
  };
}
