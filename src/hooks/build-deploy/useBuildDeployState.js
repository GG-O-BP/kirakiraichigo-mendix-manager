import { useState } from "react";

export function useBuildDeployState() {
  const [buildResults, setBuildResults] = useState({
    successful: [],
    failed: [],
  });
  const [inlineResults, setInlineResults] = useState(null);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [lastOperationType, setLastOperationType] = useState(null);

  return {
    buildResults,
    setBuildResults,
    inlineResults,
    setInlineResults,
    isUninstalling,
    setIsUninstalling,
    lastOperationType,
    setLastOperationType,
  };
}
