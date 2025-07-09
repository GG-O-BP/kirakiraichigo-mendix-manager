import * as R from "ramda";
import { memo } from "react";

// Check if modal should be visible
const shouldShowModal = R.prop("isOpen");

// Check if has related apps
const hasRelatedApps = R.pipe(
  R.prop("relatedApps"),
  R.both(R.is(Array), R.complement(R.isEmpty)),
);

// Get button text based on loading state
const getButtonText = R.curry((loadingText, defaultText, isLoading) =>
  isLoading ? loadingText : defaultText,
);

// Render related app item
const renderRelatedAppItem = (app) => (
  <li key={R.prop("name", app)} className="related-app-item">
    <span className="app-icon">📱</span>
    <span className="app-name">{R.prop("name", app)}</span>
    <span className="app-version">v{R.prop("version", app)}</span>
  </li>
);

// Render related apps list
const renderRelatedAppsList = R.ifElse(
  R.identity,
  R.pipe(R.map(renderRelatedAppItem), (items) => (
    <div className="related-apps-section">
      <h4>Related Apps that will be deleted:</h4>
      <ul className="related-apps-list">{items}</ul>
    </div>
  )),
  R.always(null),
);

// Render confirm with apps button
const renderConfirmWithAppsButton = R.curry(
  (onConfirmWithApps, isLoading, relatedApps) =>
    R.both(R.identity, () => hasRelatedApps({ relatedApps }))(
      onConfirmWithApps,
    ) ? (
      <button
        className="modal-button confirm-with-apps-button"
        onClick={onConfirmWithApps}
        disabled={isLoading}
      >
        {getButtonText("Processing...", "Uninstall + Delete Apps", isLoading)}
      </button>
    ) : null,
);

// Modal content renderer
const renderModalContent = ({
  title,
  message,
  onConfirm,
  onCancel,
  onConfirmWithApps,
  isLoading,
  relatedApps,
}) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <div className="modal-header">
        <h3>{title}</h3>
      </div>
      <div className="modal-body">
        <p>{message}</p>
        {renderRelatedAppsList(relatedApps)}
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
          {getButtonText("Processing...", "Uninstall Only", isLoading)}
        </button>
        {renderConfirmWithAppsButton(onConfirmWithApps, isLoading, relatedApps)}
      </div>
    </div>
  </div>
);

// ConfirmModal component with functional approach
const ConfirmModal = memo(
  R.ifElse(shouldShowModal, renderModalContent, R.always(null)),
);

ConfirmModal.displayName = "ConfirmModal";

export default ConfirmModal;
