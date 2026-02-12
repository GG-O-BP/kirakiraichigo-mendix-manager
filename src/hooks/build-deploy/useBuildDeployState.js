import { useAtom } from "jotai";
import {
  buildResultsAtom,
  inlineResultsAtom,
  isUninstallingAtom,
  lastOperationTypeAtom,
} from "../../atoms";

export function useBuildDeployState() {
  const [buildResults, setBuildResults] = useAtom(buildResultsAtom);
  const [inlineResults, setInlineResults] = useAtom(inlineResultsAtom);
  const [isUninstalling, setIsUninstalling] = useAtom(isUninstallingAtom);
  const [lastOperationType, setLastOperationType] = useAtom(lastOperationTypeAtom);

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
