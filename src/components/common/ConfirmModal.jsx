import * as R from "ramda";
import { memo, useEffect } from "react";

const isModalOpen = R.prop("isOpen");

const hasRelatedApps = R.pipe(
  R.prop("relatedApps"),
  R.both(R.is(Array), R.complement(R.isEmpty)),
);

const getLoadingOrDefaultText = R.curry((loadingText, defaultText, isLoading) =>
  isLoading ? loadingText : defaultText,
);

const RelatedAppItem = (app) => (
  <li key={R.prop("name", app)} className="related-app-item">
    <span className="app-icon">📱</span>
    <span className="app-name">{R.prop("name", app)}</span>
    <span className="app-version">v{R.prop("version", app)}</span>
  </li>
);

const RelatedAppsList = R.ifElse(
  R.identity,
  R.pipe(R.map(RelatedAppItem), (items) => (
    <div className="related-apps-section">
      <h4>Related Apps that will be deleted:</h4>
      <ul className="related-apps-list">{items}</ul>
    </div>
  )),
  R.always(null),
);

const ConfirmWithAppsButton = R.curry(
  (onConfirmWithApps, isLoading, relatedApps) =>
    R.both(R.identity, () => hasRelatedApps({ relatedApps }))(
      onConfirmWithApps,
    ) ? (
      <button
        className="modal-button confirm-with-apps-button"
        onClick={onConfirmWithApps}
        disabled={isLoading}
      >
        {getLoadingOrDefaultText("Processing...", "Uninstall + Delete Apps", isLoading)}
      </button>
    ) : null,
);

const ModalContent = ({
  title,
  message,
  onConfirm,
  onCancel,
  onConfirmWithApps,
  isLoading,
  relatedApps,
}) => {
  useEffect(() => {
    const handleKeyDown = R.when(
      R.both(R.propEq("Escape", "key"), () => !isLoading),
      R.tap(onCancel),
    );
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, isLoading]);

  return (
    <div className="modal-overlay">
    <div className="modal-content">
      <div className="modal-header">
        <h3>{title}</h3>
      </div>
      <div className="modal-body">
        <p style={{ whiteSpace: "pre-line" }}>{message}</p>
        {RelatedAppsList(relatedApps)}
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
          {getLoadingOrDefaultText("Processing...", "Uninstall Only", isLoading)}
        </button>
        {ConfirmWithAppsButton(onConfirmWithApps, isLoading, relatedApps)}
      </div>
    </div>
  </div>
  );
};

const ConfirmModal = memo(
  R.ifElse(isModalOpen, ModalContent, R.always(null)),
);

ConfirmModal.displayName = "ConfirmModal";

export default ConfirmModal;
