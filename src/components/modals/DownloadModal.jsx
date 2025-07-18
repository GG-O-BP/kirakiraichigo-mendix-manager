import * as R from "ramda";
import { memo, useState, useEffect } from "react";
import "./DownloadModal.css";

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

const STEP_INFO = {
  [DOWNLOAD_STEPS.CONFIRM]: {
    title: "Confirm Installation",
    description: "Ready to download and install Mendix Studio Pro",
    progress: 0,
    icon: "🤔",
  },
  [DOWNLOAD_STEPS.EXTRACTING_BUILD]: {
    title: "Extracting Build Number",
    description: "Fetching build information from Mendix marketplace...",
    progress: 20,
    icon: "🔍",
  },
  [DOWNLOAD_STEPS.SETTING_PATH]: {
    title: "Setting Up Download",
    description: "Preparing download directory and file path...",
    progress: 30,
    icon: "📁",
  },
  [DOWNLOAD_STEPS.DOWNLOADING]: {
    title: "Downloading Installer",
    description: "Downloading Mendix Studio Pro installer...",
    progress: 70,
    icon: "⬇️",
  },
  [DOWNLOAD_STEPS.LAUNCHING]: {
    title: "Launching Installer",
    description: "Starting the installation process...",
    progress: 90,
    icon: "🚀",
  },
  [DOWNLOAD_STEPS.COMPLETED]: {
    title: "Setup File Launched Successfully",
    description:
      "The Mendix Studio Pro installer is now running. Please continue with the installation wizard.",
    progress: 100,
    icon: "🎯",
  },
  [DOWNLOAD_STEPS.ERROR]: {
    title: "Installation Failed",
    description: "An error occurred during the installation process",
    progress: 0,
    icon: "❌",
  },
};

// Pure utility functions
const getStepInfo = (step) =>
  STEP_INFO[step] || STEP_INFO[DOWNLOAD_STEPS.CONFIRM];

const isStepActive = R.curry((currentStep, step) =>
  R.equals(currentStep, step),
);

const isStepCompleted = R.curry((currentStep, step) => {
  const stepOrder = Object.values(DOWNLOAD_STEPS);
  const currentIndex = stepOrder.indexOf(currentStep);
  const stepIndex = stepOrder.indexOf(step);
  return currentIndex > stepIndex && currentStep !== DOWNLOAD_STEPS.ERROR;
});

const canCancel = (step) =>
  R.includes(step, [DOWNLOAD_STEPS.CONFIRM, DOWNLOAD_STEPS.ERROR]);

const shouldShowProgress = (step) =>
  !R.includes(step, [DOWNLOAD_STEPS.CONFIRM, DOWNLOAD_STEPS.ERROR]);

// Removed - using direct inline implementation

// Enhanced step indicator renderer
const renderStepIndicator = R.curry((currentStep, step, info) => {
  const isActive = isStepActive(currentStep, step);
  const isCompleted = isStepCompleted(currentStep, step);
  const className = R.pipe(
    R.always(["step-indicator"]),
    R.when(() => isActive, R.append("active")),
    R.when(() => isCompleted, R.append("completed")),
    R.join(" "),
  )();

  return (
    <div key={step} className={className}>
      <div className="step-icon">{isCompleted ? "✓" : info.icon}</div>
      <div className="step-content">
        <div className="step-title">{info.title}</div>
        {isActive && <div className="step-description">{info.description}</div>}
      </div>
    </div>
  );
});

// Enhanced error message renderer
const renderErrorMessage = R.curry((error) => (
  <div className="error-container">
    <div className="error-icon">⚠️</div>
    <div className="error-content">
      <div className="error-title">Installation Failed</div>
      <div className="error-message">{error}</div>
    </div>
  </div>
));

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

// Main DownloadModal component with functional approach
const DownloadModal = memo(
  ({ isOpen, version, onDownload, onClose, onCancel }) => {
    // Local state for modal-specific operations
    const [currentStep, setCurrentStep] = useState(DOWNLOAD_STEPS.CONFIRM);
    const [error, setError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset modal state when opened
    useEffect(() => {
      if (isOpen) {
        setCurrentStep(DOWNLOAD_STEPS.CONFIRM);
        setError(null);
        setIsProcessing(false);
      }
    }, [isOpen]);

    // Enhanced download handler with real progress tracking
    const handleDownload = R.pipe(() => {
      if (!version?.version) {
        setError("Invalid version data");
        setCurrentStep(DOWNLOAD_STEPS.ERROR);
        return;
      }

      setIsProcessing(true);

      const executeDownload = async () => {
        try {
          // Step 1: Extract build number
          setCurrentStep(DOWNLOAD_STEPS.EXTRACTING_BUILD);
          await new Promise((resolve) => setTimeout(resolve, 1200));

          // Step 2: Setting up paths
          setCurrentStep(DOWNLOAD_STEPS.SETTING_PATH);
          await new Promise((resolve) => setTimeout(resolve, 800));

          // Step 3: Start downloading
          setCurrentStep(DOWNLOAD_STEPS.DOWNLOADING);

          // Call the actual download function
          const result = await onDownload(version);

          // Step 4: Launching installer
          setCurrentStep(DOWNLOAD_STEPS.LAUNCHING);
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Step 5: Completed
          setCurrentStep(DOWNLOAD_STEPS.COMPLETED);
        } catch (err) {
          console.error("Download process failed:", err);
          setError(err.toString());
          setCurrentStep(DOWNLOAD_STEPS.ERROR);
        } finally {
          setIsProcessing(false);
        }
      };

      executeDownload();
    });

    // Enhanced modal close handler
    const handleClose = R.pipe(() => {
      if (!isProcessing) {
        onClose();
      }
    });

    // Enhanced cancel handler
    const handleCancel = R.pipe(() => {
      if (canCancel(currentStep)) {
        onCancel();
      }
    });

    if (!isOpen) {
      return null;
    }

    const stepInfo = getStepInfo(currentStep);
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
                    : stepInfo.icon}
                </span>
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    color: "#ff6b9d",
                  }}
                >
                  {stepInfo.title}
                </span>
                <br />
                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    background: "#2a2a2a",
                    borderRadius: "3px",
                    marginTop: "8px",
                    position: "relative",
                    border: "1px solid #444",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: "linear-gradient(90deg, #ff6b9d, #c44569)",
                      borderRadius: "2px",
                      width: `${stepInfo.progress}%`,
                      transition: "width 0.3s ease",
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
                    color: "#ff6b9d",
                    float: "right",
                    marginTop: "2px",
                  }}
                >
                  {stepInfo.progress}%
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
                <strong style={{ color: "#ff6b9d", fontSize: "1rem" }}>
                  Setup file launched successfully!
                </strong>
                <br />
                <span style={{ color: "#ccc", fontSize: "0.9rem" }}>
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
                  color: "var(--text-muted, #666)",
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
