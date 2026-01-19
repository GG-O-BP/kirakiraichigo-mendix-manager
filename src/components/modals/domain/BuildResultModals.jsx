import BuildResultModal from "../BuildResultModal";
import { useModalContext, useBuildDeployContext } from "../../../contexts";

/**
 * BuildResultModals - Domain component for build result modal
 * Handles the display of build/deploy results
 * Consumes context directly instead of receiving props
 */
function BuildResultModals() {
  const { showResultModal, setShowResultModal } = useModalContext();
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
