import * as R from "ramda";
import { memo } from "react";

// ============= Helper Functions =============

// Check if modal should be visible
const shouldShowModal = R.prop("showResultModal");

// Check if has successful results
const hasSuccessfulResults = R.pipe(
  R.path(["buildResults", "successful"]),
  R.complement(R.isEmpty),
);

// Check if has failed results
const hasFailedResults = R.pipe(
  R.path(["buildResults", "failed"]),
  R.complement(R.isEmpty),
);

// Get successful results
const getSuccessfulResults = R.path(["buildResults", "successful"]);

// Get failed results
const getFailedResults = R.path(["buildResults", "failed"]);

// Get results count
const getResultsCount = R.pipe(R.length);

// Handle close action
// Handle close action with strict functional approach
const handleClose = R.curry((setShowResultModal, setBuildResults) =>
  R.pipe(
    R.tap(() => setShowResultModal(false)),
    R.tap(() => setBuildResults({ successful: [], failed: [] })),
    R.always(undefined),
  )(null),
);

// ============= Style Helpers =============

const successStyles = {
  container: {
    marginBottom: "20px",
  },
  header: {
    color: "#2ecc71",
    marginBottom: "10px",
  },
  item: {
    padding: "10px",
    background: "rgba(46, 204, 113, 0.1)",
    borderRadius: "5px",
    marginBottom: "10px",
  },
  appList: {
    fontSize: "14px",
    marginTop: "5px",
  },
};

const failedStyles = {
  header: {
    color: "#e74c3c",
    marginBottom: "10px",
  },
  item: {
    padding: "10px",
    background: "rgba(231, 76, 60, 0.1)",
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
    background: "rgba(0, 0, 0, 0.2)",
    borderRadius: "3px",
    fontSize: "12px",
    overflow: "auto",
    maxHeight: "200px",
  },
};

// ============= Render Functions =============

// Render successful result item
const renderSuccessfulItem = R.curry((result, index) => (
  <div key={index} style={successStyles.item}>
    <strong>{R.prop("widget", result)}</strong>
    <div style={successStyles.appList}>
      Deployed to: {R.pipe(R.prop("apps"), R.join(", "))(result)}
    </div>
  </div>
));

// Render failed result item
const renderFailedItem = R.curry((result, index) => (
  <details key={index} style={failedStyles.item}>
    <summary style={failedStyles.summary}>{R.prop("widget", result)}</summary>
    <pre style={failedStyles.error}>{R.prop("error", result)}</pre>
  </details>
));

// Render successful results section
const renderSuccessfulSection = R.ifElse(
  hasSuccessfulResults,
  (props) => {
    const results = getSuccessfulResults(props);
    const count = getResultsCount(results);

    return (
      <div style={successStyles.container}>
        <h4 style={successStyles.header}>✅ Successfully Deployed ({count})</h4>
        {R.addIndex(R.map)(renderSuccessfulItem, results)}
      </div>
    );
  },
  R.always(null),
);

// Render failed results section
const renderFailedSection = R.ifElse(
  hasFailedResults,
  (props) => {
    const results = getFailedResults(props);
    const count = getResultsCount(results);

    return (
      <div>
        <h4 style={failedStyles.header}>❌ Failed ({count})</h4>
        {R.addIndex(R.map)(renderFailedItem, results)}
      </div>
    );
  },
  R.always(null),
);

// Render modal content
const renderModalContent = (props) => {
  const { setShowResultModal, setBuildResults } = props;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "600px" }}>
        <div className="modal-header">
          <h3>Build & Deploy Results</h3>
        </div>
        <div className="modal-body">
          {renderSuccessfulSection(props)}
          {renderFailedSection(props)}
        </div>
        <div className="modal-footer">
          <button
            className="modal-button confirm-button"
            onClick={() => handleClose(setShowResultModal, setBuildResults)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============= Main Component =============

const BuildResultModal = memo(
  R.ifElse(shouldShowModal, renderModalContent, R.always(null)),
);

BuildResultModal.displayName = "BuildResultModal";

export default BuildResultModal;
