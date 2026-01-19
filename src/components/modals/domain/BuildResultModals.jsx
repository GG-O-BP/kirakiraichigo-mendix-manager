import BuildResultModal from "../BuildResultModal";
import { useBuildModalContext, useBuildDeployContext } from "../../../contexts";

/**
 * BuildResultModals - Domain component for build result modal
 * Handles the display of build/deploy results
 * Consumes domain-specific BuildModalContext
 */
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
