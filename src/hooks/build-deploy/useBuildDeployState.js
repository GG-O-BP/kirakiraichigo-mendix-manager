import { useState } from "react";

export function useBuildDeployState() {
  const [isInstalling, setIsInstalling] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [buildResults, setBuildResults] = useState({
    successful: [],
    failed: [],
  });
  const [inlineResults, setInlineResults] = useState(null);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [lastOperationType, setLastOperationType] = useState(null);

  return {
    isInstalling,
    setIsInstalling,
    isBuilding,
    setIsBuilding,
    isDeploying,
    setIsDeploying,
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
