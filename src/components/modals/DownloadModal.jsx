import * as R from "ramda";
import { memo, useState, useEffect, useRef, useCallback } from "react";
import "../../styles/components/download-modal.css";

// Pure data types - immutable by design
const DOWNLOAD_STEPS = {
  CONFIRM: "confirm",
  EXTRACTING_BUILD: "extracting_build",
  SETTING_PATH: "setting_path",
  DOWNLOADING: "downloading",
  LAUNCHING: "launching",
  COMPLETED: "completed",
  ERROR: "error",
};

// Step configuration with time-based progress ranges
// Progress ranges are based on actual time distribution:
// - EXTRACTING_BUILD: ~1.2s
// - SETTING_PATH: ~0.8s
// - DOWNLOADING: ~220s (variable, majority of time)
// - LAUNCHING: ~1.5s
const STEP_CONFIG = {
  [DOWNLOAD_STEPS.CONFIRM]: {
    title: "Confirm Installation",
    icon: "🤔",
    startProgress: 0,
    endProgress: 0,
    estimatedDuration: 0,
  },
  [DOWNLOAD_STEPS.EXTRACTING_BUILD]: {
    title: "Extracting Build Number",
    icon: "🔍",
    startProgress: 0,
    endProgress: 2,
    estimatedDuration: 1200,
  },
  [DOWNLOAD_STEPS.SETTING_PATH]: {
    title: "Setting Up Download",
    icon: "📁",
    startProgress: 2,
    endProgress: 5,
    estimatedDuration: 800,
  },
  [DOWNLOAD_STEPS.DOWNLOADING]: {
    title: "Downloading Installer",
    icon: "⬇️",
    startProgress: 5,
    endProgress: 95,
    estimatedDuration: 250000, // ~250 seconds estimated
  },
  [DOWNLOAD_STEPS.LAUNCHING]: {
    title: "Launching Installer",
    icon: "🚀",
    startProgress: 95,
    endProgress: 99,
    estimatedDuration: 1500,
  },
  [DOWNLOAD_STEPS.COMPLETED]: {
    title: "Setup File Launched Successfully",
    icon: "🎯",
    startProgress: 100,
    endProgress: 100,
    estimatedDuration: 0,
  },
  [DOWNLOAD_STEPS.ERROR]: {
    title: "Installation Failed",
    icon: "❌",
    startProgress: 0,
    endProgress: 0,
    estimatedDuration: 0,
  },
};

// Pure utility functions
const getStepConfig = (step) =>
  STEP_CONFIG[step] || STEP_CONFIG[DOWNLOAD_STEPS.CONFIRM];

const canCancel = (step) =>
  R.includes(step, [DOWNLOAD_STEPS.CONFIRM, DOWNLOAD_STEPS.ERROR]);

const shouldShowProgress = (step) =>
  !R.includes(step, [DOWNLOAD_STEPS.CONFIRM, DOWNLOAD_STEPS.ERROR]);

// Calculate animated progress target (100% of step range)
const calculateAnimationTarget = (config) => config.endProgress;

// Easing function for smooth animation (ease-out cubic)
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// Enhanced error message renderer
const renderErrorMessage = (error) => (
  <div className="error-container">
    <div className="error-icon">⚠️</div>
    <div className="error-content">
      <div className="error-title">Installation Failed</div>
      <div className="error-message">{error}</div>
    </div>
  </div>
);

// Enhanced action buttons renderer with functional composition
const renderActionButtons = R.curry(
  (currentStep, onConfirm, onCancel, onClose) => {
    const showCancel = canCancel(currentStep);
    const showConfirm = currentStep === DOWNLOAD_STEPS.CONFIRM;
    const showClose = R.includes(currentStep, [
      DOWNLOAD_STEPS.COMPLETED,
      DOWNLOAD_STEPS.ERROR,
    ]);

    return (
      <div className="modal-actions">
        {showCancel && (
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        {showConfirm && (
          <button className="btn btn-primary" onClick={onConfirm}>
            <span className="btn-icon">🍓</span>
            Start Installation
          </button>
        )}
        {showClose && (
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    );
  },
);

// Custom hook for animated progress
const useAnimatedProgress = (currentStep, isProcessing) => {
  const [progress, setProgress] = useState(0);
  const animationRef = useRef(null);
  const stepStartTimeRef = useRef(null);

  useEffect(() => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const config = getStepConfig(currentStep);

    // For COMPLETED step, immediately set to 100%
    if (currentStep === DOWNLOAD_STEPS.COMPLETED) {
      setProgress(100);
      return;
    }

    // For ERROR or CONFIRM, set to start progress
    if (
      currentStep === DOWNLOAD_STEPS.ERROR ||
      currentStep === DOWNLOAD_STEPS.CONFIRM
    ) {
      setProgress(config.startProgress);
      return;
    }

    // If not processing, just set to start progress
    if (!isProcessing) {
      setProgress(config.startProgress);
      return;
    }

    // Start animation
    stepStartTimeRef.current = performance.now();
    const startProgress = config.startProgress;
    const targetProgress = calculateAnimationTarget(config);
    const duration = config.estimatedDuration;

    const animate = (currentTime) => {
      const elapsed = currentTime - stepStartTimeRef.current;
      const rawProgress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(rawProgress);

      const newProgress =
        startProgress + (targetProgress - startProgress) * easedProgress;
      setProgress(newProgress);

      // Continue animation if not reached 90% of duration
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

  // Return both raw value for smooth bar and rounded for display
  return progress;
};

// Main DownloadModal component with functional approach
const DownloadModal = memo(
  ({ isOpen, version, onDownload, onClose, onCancel }) => {
    // Local state for modal-specific operations
    const [currentStep, setCurrentStep] = useState(DOWNLOAD_STEPS.CONFIRM);
    const [error, setError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Animated progress
    const animatedProgress = useAnimatedProgress(currentStep, isProcessing);

    // Reset modal state when opened
    useEffect(() => {
      if (isOpen) {
        setCurrentStep(DOWNLOAD_STEPS.CONFIRM);
        setError(null);
        setIsProcessing(false);
      }
    }, [isOpen]);

    const handleDownload = useCallback(() => {
      if (!version?.version) {
        setError("Invalid version data");
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
    }, [version, onDownload]);

    const handleClose = useCallback(() => {
      if (!isProcessing) {
        onClose();
      }
    }, [isProcessing, onClose]);

    const handleCancel = useCallback(() => {
      if (canCancel(currentStep)) {
        onCancel();
      }
    }, [currentStep, onCancel]);

    if (!isOpen) {
      return null;
    }

    const stepConfig = getStepConfig(currentStep);
    const showProgressBar = shouldShowProgress(currentStep);

    return (
      <div className="modal-overlay">
        <div className="download-modal">
          <div className="modal-header">
            <h2 className="modal-title">
              Install Mendix Studio Pro {version?.version}
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
                    This will download and install{" "}
                    <strong>Mendix Studio Pro {version?.version}</strong>
                  </p>
                  <ul className="install-steps">
                    <li>Extract build number from Mendix marketplace</li>
                    <li>Download the installer file (~600MB)</li>
                    <li>Launch the installation wizard</li>
                  </ul>
                  <p className="confirm-note">
                    The installation wizard will guide you through the final
                    setup steps.
                  </p>
                </div>
              </div>
            )}

            {currentStep === DOWNLOAD_STEPS.ERROR &&
              error &&
              renderErrorMessage(error)}

            {showProgressBar && (
              <>
                <span style={{ fontSize: "1.2rem", marginRight: "8px" }}>
                  {isProcessing && currentStep !== DOWNLOAD_STEPS.COMPLETED
                    ? "🍓"
                    : stepConfig.icon}
                </span>
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    color: "var(--theme-primary)",
                  }}
                >
                  {stepConfig.title}
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
                  Setup file launched successfully!
                </strong>
                <br />
                <span
                  style={{
                    color: "var(--theme-text-secondary)",
                    fontSize: "0.9rem",
                  }}
                >
                  Please follow the installation wizard to complete the setup
                  process.
                </span>
              </>
            )}
          </div>

          <div className="modal-footer">
            {renderActionButtons(
              currentStep,
              handleDownload,
              handleCancel,
              handleClose,
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
                Please wait, this process may take a few minutes...
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
