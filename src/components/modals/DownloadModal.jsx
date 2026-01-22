import * as R from "ramda";
import { memo, useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "../../i18n/useI18n";
import "../../styles/components/download-modal.css";

const DOWNLOAD_STEPS = {
  CONFIRM: "confirm",
  EXTRACTING_BUILD: "extracting_build",
  SETTING_PATH: "setting_path",
  DOWNLOADING: "downloading",
  LAUNCHING: "launching",
  COMPLETED: "completed",
  ERROR: "error",
};

const STEP_TITLE_KEYS = {
  [DOWNLOAD_STEPS.CONFIRM]: "title",
  [DOWNLOAD_STEPS.EXTRACTING_BUILD]: "extracting",
  [DOWNLOAD_STEPS.SETTING_PATH]: "settingUp",
  [DOWNLOAD_STEPS.DOWNLOADING]: "downloading",
  [DOWNLOAD_STEPS.LAUNCHING]: "launchingInstaller",
  [DOWNLOAD_STEPS.COMPLETED]: "launchSuccess",
  [DOWNLOAD_STEPS.ERROR]: "installFailed",
};

const STEP_ICONS = {
  [DOWNLOAD_STEPS.CONFIRM]: "🤔",
  [DOWNLOAD_STEPS.EXTRACTING_BUILD]: "🔍",
  [DOWNLOAD_STEPS.SETTING_PATH]: "📁",
  [DOWNLOAD_STEPS.DOWNLOADING]: "⬇️",
  [DOWNLOAD_STEPS.LAUNCHING]: "🚀",
  [DOWNLOAD_STEPS.COMPLETED]: "🎯",
  [DOWNLOAD_STEPS.ERROR]: "❌",
};

const STEP_PROGRESS = {
  [DOWNLOAD_STEPS.CONFIRM]: { start: 0, end: 0, duration: 0 },
  [DOWNLOAD_STEPS.EXTRACTING_BUILD]: { start: 0, end: 2, duration: 1200 },
  [DOWNLOAD_STEPS.SETTING_PATH]: { start: 2, end: 5, duration: 800 },
  [DOWNLOAD_STEPS.DOWNLOADING]: { start: 5, end: 95, duration: 250000 },
  [DOWNLOAD_STEPS.LAUNCHING]: { start: 95, end: 99, duration: 1500 },
  [DOWNLOAD_STEPS.COMPLETED]: { start: 100, end: 100, duration: 0 },
  [DOWNLOAD_STEPS.ERROR]: { start: 0, end: 0, duration: 0 },
};

const getStepProgress = (step) =>
  STEP_PROGRESS[step] || STEP_PROGRESS[DOWNLOAD_STEPS.CONFIRM];

const isCancellableStep = (step) =>
  R.includes(step, [DOWNLOAD_STEPS.CONFIRM, DOWNLOAD_STEPS.ERROR]);

const isProgressVisibleStep = (step) =>
  !R.includes(step, [DOWNLOAD_STEPS.CONFIRM, DOWNLOAD_STEPS.ERROR]);

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const ErrorMessage = (error, t) => (
  <div className="error-container">
    <div className="error-icon">⚠️</div>
    <div className="error-content">
      <div className="error-title">{R.pathOr("Installation Failed", ["modals", "download", "installFailed"], t)}</div>
      <div className="error-message">{error}</div>
    </div>
  </div>
);

const ActionButtons = R.curry(
  (currentStep, onConfirm, onCancel, onClose, t) => {
    const showCancel = isCancellableStep(currentStep);
    const showConfirm = currentStep === DOWNLOAD_STEPS.CONFIRM;
    const showClose = R.includes(currentStep, [
      DOWNLOAD_STEPS.COMPLETED,
      DOWNLOAD_STEPS.ERROR,
    ]);

    return (
      <div className="modal-actions">
        {showCancel && (
          <button className="btn btn-secondary" onClick={onCancel}>
            {R.pathOr("Cancel", ["common", "cancel"], t)}
          </button>
        )}
        {showConfirm && (
          <button className="btn btn-primary" onClick={onConfirm}>
            <span className="btn-icon">🍓</span>
            {R.pathOr("Start Installation", ["modals", "download", "startInstallation"], t)}
          </button>
        )}
        {showClose && (
          <button className="btn btn-primary" onClick={onClose}>
            {R.pathOr("Close", ["common", "close"], t)}
          </button>
        )}
      </div>
    );
  },
);

const useAnimatedProgress = (currentStep, isProcessing) => {
  const [progress, setProgress] = useState(0);
  const animationRef = useRef(null);
  const stepStartTimeRef = useRef(null);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const config = getStepProgress(currentStep);

    if (currentStep === DOWNLOAD_STEPS.COMPLETED) {
      setProgress(100);
      return;
    }

    if (
      currentStep === DOWNLOAD_STEPS.ERROR ||
      currentStep === DOWNLOAD_STEPS.CONFIRM
    ) {
      setProgress(config.start);
      return;
    }

    if (!isProcessing) {
      setProgress(config.start);
      return;
    }

    stepStartTimeRef.current = performance.now();
    const startProgress = config.start;
    const targetProgress = config.end;
    const duration = config.duration;

    const animate = (currentTime) => {
      const elapsed = currentTime - stepStartTimeRef.current;
      const rawProgress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(rawProgress);

      const newProgress =
        startProgress + (targetProgress - startProgress) * easedProgress;
      setProgress(newProgress);

      if (rawProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentStep, isProcessing]);

  return progress;
};

const DownloadModal = memo(
  ({ isOpen, version, onDownload, onClose, onCancel }) => {
    const { t } = useI18n();
    const [currentStep, setCurrentStep] = useState(DOWNLOAD_STEPS.CONFIRM);
    const [error, setError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const animatedProgress = useAnimatedProgress(currentStep, isProcessing);

    const getStepTitle = (step) =>
      R.pathOr(
        STEP_TITLE_KEYS[step],
        ["modals", "download", STEP_TITLE_KEYS[step]],
        t,
      );

    useEffect(() => {
      if (isOpen) {
        setCurrentStep(DOWNLOAD_STEPS.CONFIRM);
        setError(null);
        setIsProcessing(false);
      }
    }, [isOpen]);

    const handleDownload = useCallback(() => {
      if (!version?.version) {
        setError(R.pathOr("Invalid version data", ["modals", "download", "invalidVersion"], t));
        setCurrentStep(DOWNLOAD_STEPS.ERROR);
        return;
      }

      setIsProcessing(true);

      const executeDownload = async () => {
        try {
          setCurrentStep(DOWNLOAD_STEPS.EXTRACTING_BUILD);
          await new Promise((resolve) => setTimeout(resolve, 1200));

          setCurrentStep(DOWNLOAD_STEPS.SETTING_PATH);
          await new Promise((resolve) => setTimeout(resolve, 800));

          setCurrentStep(DOWNLOAD_STEPS.DOWNLOADING);
          await onDownload(version);

          setCurrentStep(DOWNLOAD_STEPS.LAUNCHING);
          await new Promise((resolve) => setTimeout(resolve, 1500));

          setCurrentStep(DOWNLOAD_STEPS.COMPLETED);
        } catch (err) {
          setError(err.toString());
          setCurrentStep(DOWNLOAD_STEPS.ERROR);
        } finally {
          setIsProcessing(false);
        }
      };

      executeDownload();
    }, [version, onDownload, t]);

    const handleClose = useCallback(() => {
      if (!isProcessing) {
        onClose();
      }
    }, [isProcessing, onClose]);

    const handleCancel = useCallback(() => {
      if (isCancellableStep(currentStep)) {
        onCancel();
      }
    }, [currentStep, onCancel]);

    useEffect(() => {
      const handleKeyDown = R.when(
        R.propEq("Escape", "key"),
        R.tap(() => {
          R.cond([
            [() => isCancellableStep(currentStep), handleCancel],
            [() => R.includes(currentStep, [DOWNLOAD_STEPS.COMPLETED]), handleClose],
            [R.T, R.identity],
          ])(null);
        }),
      );
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentStep, handleCancel, handleClose]);

    if (!isOpen) {
      return null;
    }

    const showProgressBar = isProgressVisibleStep(currentStep);
    const stepTitle = getStepTitle(currentStep);
    const stepIcon = STEP_ICONS[currentStep];

    return (
      <div className="modal-overlay">
        <div className="download-modal">
          <div className="modal-header">
            <h2 className="modal-title">
              {R.pathOr(
                `Install Mendix Studio Pro ${version?.version}`,
                ["modals", "download", "installTitle"],
                t,
              ).replace("{version}", version?.version || "")}
            </h2>
            {!isProcessing && (
              <button
                className="modal-close"
                onClick={handleClose}
                aria-label="Close"
              >
                ×
              </button>
            )}
          </div>

          <div className="modal-content-progress">
            {currentStep === DOWNLOAD_STEPS.CONFIRM && (
              <div className="confirm-content">
                <div className="confirm-icon">🍓</div>
                <div className="confirm-message">
                  <p>
                    {R.pathOr(
                      `This will download and install Mendix Studio Pro ${version?.version}`,
                      ["modals", "download", "description"],
                      t,
                    ).replace("{version}", version?.version || "")}
                  </p>
                  <ul className="install-steps">
                    <li>{R.pathOr("Extract build number from Mendix marketplace", ["modals", "download", "extractBuildNumber"], t)}</li>
                    <li>{R.pathOr("Download the installer file (~600MB)", ["modals", "download", "downloadInstaller"], t)}</li>
                    <li>{R.pathOr("Launch the installation wizard", ["modals", "download", "launchWizard"], t)}</li>
                  </ul>
                  <p className="confirm-note">
                    {R.pathOr(
                      "The installation wizard will guide you through the final setup steps.",
                      ["modals", "download", "wizardGuide"],
                      t,
                    )}
                  </p>
                </div>
              </div>
            )}

            {currentStep === DOWNLOAD_STEPS.ERROR &&
              error &&
              ErrorMessage(error, t)}

            {showProgressBar && (
              <>
                <span style={{ fontSize: "1.2rem", marginRight: "8px" }}>
                  {isProcessing && currentStep !== DOWNLOAD_STEPS.COMPLETED
                    ? "🍓"
                    : stepIcon}
                </span>
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    color: "var(--theme-primary)",
                  }}
                >
                  {stepTitle}
                </span>
                <br />
                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    background: "var(--theme-surface-secondary)",
                    borderRadius: "3px",
                    marginTop: "8px",
                    position: "relative",
                    border: "1px solid var(--theme-border)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background:
                        "linear-gradient(90deg, var(--theme-primary), var(--theme-secondary))",
                      borderRadius: "2px",
                      width: `${animatedProgress}%`,
                      position: "relative",
                    }}
                  >
                    {isProcessing && (
                      <span
                        style={{
                          position: "absolute",
                          right: "-20px",
                          top: "-15px",
                          fontSize: "1.5rem",
                        }}
                      >
                        🍓
                      </span>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--theme-primary)",
                    float: "right",
                    marginTop: "2px",
                  }}
                >
                  {Math.round(animatedProgress)}%
                </span>
                <div style={{ clear: "both" }} />
              </>
            )}

            {currentStep === DOWNLOAD_STEPS.COMPLETED && (
              <>
                <span style={{ fontSize: "1.5rem", marginLeft: "4px" }}>
                  ✨
                </span>
                <br />
                <br />
                <strong
                  style={{ color: "var(--theme-primary)", fontSize: "1rem" }}
                >
                  {R.pathOr("Setup file launched successfully!", ["modals", "download", "setupSuccess"], t)}
                </strong>
                <br />
                <span
                  style={{
                    color: "var(--theme-text-secondary)",
                    fontSize: "0.9rem",
                  }}
                >
                  {R.pathOr(
                    "Please follow the installation wizard to complete the setup process.",
                    ["modals", "download", "followWizard"],
                    t,
                  )}
                </span>
              </>
            )}
          </div>

          <div className="modal-footer">
            {ActionButtons(
              currentStep,
              handleDownload,
              handleCancel,
              handleClose,
              t,
            )}

            {isProcessing && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: "0.875rem",
                  color: "var(--theme-text-muted)",
                  marginTop: "8px",
                }}
              >
                {R.pathOr("Please wait, this process may take a few minutes...", ["modals", "download", "pleaseWait"], t)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

DownloadModal.displayName = "DownloadModal";

export default DownloadModal;
