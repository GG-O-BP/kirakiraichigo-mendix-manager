import BuildResultModal from "../BuildResultModal";
import { useBuildModalContext, useBuildDeployContext } from "../../../contexts";

function BuildResultModals() {
  const { showResultModal, setShowResultModal } = useBuildModalContext();
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
