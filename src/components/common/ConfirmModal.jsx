import * as R from "ramda";
import { memo, useEffect } from "react";
import { useI18n } from "../../i18n/useI18n";

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

const RelatedAppsList = R.curry((t, relatedApps) =>
  R.ifElse(
    R.identity,
    R.pipe(R.map(RelatedAppItem), (items) => (
      <div className="related-apps-section">
        <h4>{R.pathOr("Related Apps that will be deleted:", ["apps", "relatedApps"], t)}</h4>
        <ul className="related-apps-list">{items}</ul>
      </div>
    )),
    R.always(null),
  )(relatedApps),
);

const ConfirmWithAppsButton = R.curry(
  (t, onConfirmWithApps, isLoading, relatedApps) =>
    R.both(R.identity, () => hasRelatedApps({ relatedApps }))(
      onConfirmWithApps,
    ) ? (
      <button
        className="modal-button confirm-with-apps-button"
        onClick={onConfirmWithApps}
        disabled={isLoading}
      >
        {getLoadingOrDefaultText(
          R.pathOr("Processing...", ["modals", "confirm", "processing"], t),
          R.pathOr("Uninstall + Delete Apps", ["modals", "studioPro", "uninstallAndDeleteApps"], t),
          isLoading,
        )}
      </button>
    ) : null,
);

const ModalContentComponent = ({
  title,
  message,
  onConfirm,
  onCancel,
  onConfirmWithApps,
  isLoading,
  relatedApps,
}) => {
  const { t } = useI18n();

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
        {RelatedAppsList(t, relatedApps)}
      </div>
      <div className="modal-footer">
        <button
          className="modal-button cancel-button"
          onClick={onCancel}
          disabled={isLoading}
        >
          {R.pathOr("Cancel", ["common", "cancel"], t)}
        </button>
        <button
          className="modal-button confirm-button"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {getLoadingOrDefaultText(
            R.pathOr("Processing...", ["modals", "confirm", "processing"], t),
            R.pathOr("Uninstall Only", ["modals", "studioPro", "uninstallOnly"], t),
            isLoading,
          )}
        </button>
        {ConfirmWithAppsButton(t, onConfirmWithApps, isLoading, relatedApps)}
      </div>
    </div>
  </div>
  );
};

const ConfirmModal = memo(
  R.ifElse(isModalOpen, ModalContentComponent, R.always(null)),
);

ConfirmModal.displayName = "ConfirmModal";

export default ConfirmModal;
