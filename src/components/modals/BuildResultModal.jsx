import * as R from "ramda";
import { memo, useEffect } from "react";

const shouldShowModal = R.prop("showResultModal");

const hasFailedResults = R.pipe(
  R.path(["buildResults", "failed"]),
  R.complement(R.isEmpty),
);

const getFailedResults = R.path(["buildResults", "failed"]);

const handleClose = R.curry((setShowResultModal, setBuildResults) =>
  R.pipe(
    R.tap(() => setShowResultModal(false)),
    R.tap(() => setBuildResults({ successful: [], failed: [] })),
    R.always(undefined),
  )(null),
);

const failedStyles = {
  header: {
    color: "var(--theme-error)",
    marginBottom: "10px",
  },
  item: {
    padding: "10px",
    background: "var(--theme-error-bg)",
    borderRadius: "5px",
    marginBottom: "10px",
  },
  summary: {
    cursor: "pointer",
    fontWeight: "bold",
  },
  error: {
    marginTop: "10px",
    padding: "10px",
    background: "var(--theme-surface-secondary)",
    borderRadius: "3px",
    fontSize: "12px",
    overflow: "auto",
    maxHeight: "200px",
  },
};

const renderFailedItem = R.curry((result, index) => (
  <details key={index} style={failedStyles.item}>
    <summary style={failedStyles.summary}>{R.prop("widget", result)}</summary>
    <pre style={failedStyles.error}>{R.prop("error", result)}</pre>
  </details>
));

const renderFailedSection = R.ifElse(
  hasFailedResults,
  (props) => {
    const results = getFailedResults(props);
    const count = R.length(results);

    return (
      <div>
        <h4 style={failedStyles.header}>❌ Failed ({count})</h4>
        {R.addIndex(R.map)(renderFailedItem, results)}
      </div>
    );
  },
  R.always(null),
);

const ModalContent = (props) => {
  const { setShowResultModal, setBuildResults } = props;
  const closeModal = () => handleClose(setShowResultModal, setBuildResults);

  useEffect(() => {
    const handleKeyDown = R.when(R.propEq("Escape", "key"), R.tap(closeModal));
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setShowResultModal, setBuildResults]);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "600px" }}>
        <div className="modal-header">
          <h3>Build & Deploy Errors</h3>
        </div>
        <div className="modal-body">{renderFailedSection(props)}</div>
        <div className="modal-footer">
          <button
            className="modal-button confirm-button"
            onClick={closeModal}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const BuildResultModal = memo(
  R.ifElse(shouldShowModal, ModalContent, R.always(null)),
);

BuildResultModal.displayName = "BuildResultModal";

export default BuildResultModal;
