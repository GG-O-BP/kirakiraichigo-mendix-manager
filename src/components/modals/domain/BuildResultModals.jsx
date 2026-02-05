import { useAtom } from "jotai";
import BuildResultModal from "../BuildResultModal";
import { useBuildDeploy } from "../../../hooks";
import { showResultModalAtom } from "../../../atoms";

function BuildResultModals() {
  const [showResultModal, setShowResultModal] = useAtom(showResultModalAtom);
  const { buildResults, setBuildResults } = useBuildDeploy();

  return (
    <BuildResultModal
      showResultModal={showResultModal}
      buildResults={buildResults}
      setShowResultModal={setShowResultModal}
      setBuildResults={setBuildResults}
    />
  );
}

export default BuildResultModals;
