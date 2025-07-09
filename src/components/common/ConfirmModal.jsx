const ConfirmModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  onConfirmWithApps,
  isLoading,
  relatedApps,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
          {relatedApps && relatedApps.length > 0 && (
            <div className="related-apps-section">
              <h4>Related Apps that will be deleted:</h4>
              <ul className="related-apps-list">
                {relatedApps.map((app) => (
                  <li key={app.name} className="related-app-item">
                    <span className="app-icon">📱</span>
                    <span className="app-name">{app.name}</span>
                    <span className="app-version">v{app.version}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="modal-button cancel-button"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="modal-button confirm-button"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Uninstall Only"}
          </button>
          {onConfirmWithApps && relatedApps && relatedApps.length > 0 && (
            <button
              className="modal-button confirm-with-apps-button"
              onClick={onConfirmWithApps}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Uninstall + Delete Apps"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
