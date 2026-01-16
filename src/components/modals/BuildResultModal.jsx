import * as R from "ramda";
import { memo } from "react";

const shouldShowModal = R.prop("showResultModal");

const hasSuccessfulResults = R.pipe(
  R.path(["buildResults", "successful"]),
  R.complement(R.isEmpty),
);

const hasFailedResults = R.pipe(
  R.path(["buildResults", "failed"]),
  R.complement(R.isEmpty),
);

const getSuccessfulResults = R.path(["buildResults", "successful"]);

const getFailedResults = R.path(["buildResults", "failed"]);

const getResultsCount = R.pipe(R.length);

const handleClose = R.curry((setShowResultModal, setBuildResults) =>
  R.pipe(
    R.tap(() => setShowResultModal(false)),
    R.tap(() => setBuildResults({ successful: [], failed: [] })),
    R.always(undefined),
  )(null),
);

const successStyles = {
  container: {
    marginBottom: "20px",
  },
  header: {
    color: "var(--theme-success)",
    marginBottom: "10px",
  },
  item: {
    padding: "10px",
    background: "var(--theme-success-bg)",
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

const renderSuccessfulItem = R.curry((result, index) => (
  <div key={index} style={successStyles.item}>
    <strong>{R.prop("widget", result)}</strong>
    <div style={successStyles.appList}>
      Deployed to: {R.pipe(R.prop("apps"), R.join(", "))(result)}
    </div>
  </div>
));

const renderFailedItem = R.curry((result, index) => (
  <details key={index} style={failedStyles.item}>
    <summary style={failedStyles.summary}>{R.prop("widget", result)}</summary>
    <pre style={failedStyles.error}>{R.prop("error", result)}</pre>
  </details>
));

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

const renderModalContent = (props) => {
  const { setShowResultModal, setBuildResults } = props;

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
            onClick={() => handleClose(setShowResultModal, setBuildResults)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const BuildResultModal = memo(
  R.ifElse(shouldShowModal, renderModalContent, R.always(null)),
);

BuildResultModal.displayName = "BuildResultModal";

export default BuildResultModal;
