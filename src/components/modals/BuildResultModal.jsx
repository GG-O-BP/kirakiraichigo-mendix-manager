const BuildResultModal = ({
  showResultModal,
  buildResults,
  setShowResultModal,
  setBuildResults,
}) => {
  if (!showResultModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "600px" }}>
        <div className="modal-header">
          <h3>Build & Deploy Results</h3>
        </div>
        <div className="modal-body">
          {buildResults.successful.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ color: "#2ecc71", marginBottom: "10px" }}>
                ✅ Successfully Deployed ({buildResults.successful.length})
              </h4>
              {buildResults.successful.map((result, index) => (
                <div
                  key={index}
                  style={{
                    padding: "10px",
                    background: "rgba(46, 204, 113, 0.1)",
                    borderRadius: "5px",
                    marginBottom: "10px",
                  }}
                >
                  <strong>{result.widget}</strong>
                  <div style={{ fontSize: "14px", marginTop: "5px" }}>
                    Deployed to: {result.apps.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          )}

          {buildResults.failed.length > 0 && (
            <div>
              <h4 style={{ color: "#e74c3c", marginBottom: "10px" }}>
                ❌ Failed ({buildResults.failed.length})
              </h4>
              {buildResults.failed.map((result, index) => (
                <details
                  key={index}
                  style={{
                    padding: "10px",
                    background: "rgba(231, 76, 60, 0.1)",
                    borderRadius: "5px",
                    marginBottom: "10px",
                  }}
                >
                  <summary
                    style={{ cursor: "pointer", fontWeight: "bold" }}
                  >
                    {result.widget}
                  </summary>
                  <pre
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      background: "rgba(0, 0, 0, 0.2)",
                      borderRadius: "3px",
                      fontSize: "12px",
                      overflow: "auto",
                      maxHeight: "200px",
                    }}
                  >
                    {result.error}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="modal-button confirm-button"
            onClick={() => {
              setShowResultModal(false);
              setBuildResults({ successful: [], failed: [] });
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuildResultModal;
