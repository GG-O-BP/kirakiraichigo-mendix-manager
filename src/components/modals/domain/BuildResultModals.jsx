import { useAtom } from "jotai";
import BuildResultModal from "../BuildResultModal";
import { useBuildDeployContext } from "../../../contexts";
import { showResultModalAtom } from "../../../atoms";

function BuildResultModals() {
  const [showResultModal, setShowResultModal] = useAtom(showResultModalAtom);
  const { buildResults, setBuildResults } = useBuildDeployContext();

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
