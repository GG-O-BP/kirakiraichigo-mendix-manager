import BuildResultModal from "../BuildResultModal";

/**
 * BuildResultModals - Domain component for build result modal
 * Handles the display of build/deploy results
 */
function BuildResultModals({
  resultModal,
  buildResults,
  setBuildResults,
}) {
  return (
    <BuildResultModal
      showResultModal={resultModal.showModal}
      buildResults={buildResults}
      setShowResultModal={resultModal.setShowModal}
      setBuildResults={setBuildResults}
    />
  );
}

export default BuildResultModals;
