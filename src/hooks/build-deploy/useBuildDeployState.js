import { useState } from "react";

export function useBuildDeployState() {
  const [isInstalling, setIsInstalling] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildResults, setBuildResults] = useState({
    successful: [],
    failed: [],
  });
  const [inlineResults, setInlineResults] = useState(null);
  const [isUninstalling, setIsUninstalling] = useState(false);

  return {
    isInstalling,
    setIsInstalling,
    isBuilding,
    setIsBuilding,
    buildResults,
    setBuildResults,
    inlineResults,
    setInlineResults,
    isUninstalling,
    setIsUninstalling,
  };
}
