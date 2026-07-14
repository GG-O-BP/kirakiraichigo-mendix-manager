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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getStepProgress = (step) =>
  R.propOr(R.prop(DOWNLOAD_STEPS.CONFIRM, STEP_PROGRESS), step, STEP_PROGRESS);

const isCancellableStep = (step) =>
  R.includes(step, [DOWNLOAD_STEPS.CONFIRM, DOWNLOAD_STEPS.ERROR]);

const isProgressVisibleStep = R.complement(isCancellableStep);

const easeOutCubic = (t) => R.subtract(1, Math.pow(R.subtract(1, t), 3));

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
    const showConfirm = R.equals(DOWNLOAD_STEPS.CONFIRM, currentStep);
    const showClose = R.includes(currentStep, [
      DOWNLOAD_STEPS.COMPLETED,
      DOWNLOAD_STEPS.ERROR,
    ]);

    return (
      <div className="modal-actions">
        {R.ifElse(
          R.identity,
          () => (
            <button className="btn btn-secondary" onClick={onCancel}>
              {R.pathOr("Cancel", ["common", "cancel"], t)}
            </button>
          ),
          R.always(null),
        )(showCancel)}
        {R.ifElse(
          R.identity,
          () => (
            <button className="btn btn-primary" onClick={onConfirm}>
              <span className="btn-icon">🍓</span>
              {R.pathOr("Start Installation", ["modals", "download", "startInstallation"], t)}
            </button>
          ),
          R.always(null),
        )(showConfirm)}
        {R.ifElse(
          R.identity,
          () => (
            <button className="btn btn-primary" onClick={onClose}>
              {R.pathOr("Close", ["common", "close"], t)}
            </button>
          ),
          R.always(null),
        )(showClose)}
      </div>
    );
  },
);

const useAnimatedProgress = (currentStep, isProcessing) => {
  const [progress, setProgress] = useState(0);
  const animationRef = useRef(null);
  const stepStartTimeRef = useRef(null);

  useEffect(() => {
    R.when(R.isNotNil, (frame) => {
      cancelAnimationFrame(frame);
      animationRef.current = null;
    })(animationRef.current);

    const config = getStepProgress(currentStep);

    return R.cond([
      [
        () => R.equals(DOWNLOAD_STEPS.COMPLETED, currentStep),
        () => setProgress(100),
      ],
      [
        () => R.includes(currentStep, [DOWNLOAD_STEPS.ERROR, DOWNLOAD_STEPS.CONFIRM]),
        () => setProgress(R.prop("start", config)),
      ],
      [
        () => R.not(isProcessing),
        () => setProgress(R.prop("start", config)),
      ],
      [
        R.T,
        () => {
          stepStartTimeRef.current = performance.now();
          const startProgress = R.prop("start", config);
          const targetProgress = R.prop("end", config);
          const duration = R.prop("duration", config);

          const animate = (currentTime) => {
            const rawProgress = R.min(
              R.divide(R.subtract(currentTime, stepStartTimeRef.current), duration),
              1,
            );
            const easedProgress = easeOutCubic(rawProgress);

            setProgress(
              R.add(
                startProgress,
                R.multiply(R.subtract(targetProgress, startProgress), easedProgress),
              ),
            );

            R.when(
              R.gt(1),
              () => {
                animationRef.current = requestAnimationFrame(animate);
              },
            )(rawProgress);
          };

          animationRef.current = requestAnimationFrame(animate);

          return () => {
            R.when(R.isNotNil, cancelAnimationFrame)(animationRef.current);
          };
        },
      ],
    ])();
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
        R.prop(step, STEP_TITLE_KEYS),
        ["modals", "download", R.prop(step, STEP_TITLE_KEYS)],
        t,
      );

    useEffect(() => {
      R.when(R.identity, () => {
        setCurrentStep(DOWNLOAD_STEPS.CONFIRM);
        setError(null);
        setIsProcessing(false);
      })(isOpen);
    }, [isOpen]);

    const handleDownload = useCallback(() => {
      R.ifElse(
        R.either(R.isNil, R.isEmpty),
        () => {
          setError(R.pathOr("Invalid version data", ["modals", "download", "invalidVersion"], t));
          setCurrentStep(DOWNLOAD_STEPS.ERROR);
        },
        () => {
          setIsProcessing(true);
          R.pipe(
            () => Promise.resolve(),
            R.andThen(() => setCurrentStep(DOWNLOAD_STEPS.EXTRACTING_BUILD)),
            R.andThen(() => delay(1200)),
            R.andThen(() => setCurrentStep(DOWNLOAD_STEPS.SETTING_PATH)),
            R.andThen(() => delay(800)),
            R.andThen(() => setCurrentStep(DOWNLOAD_STEPS.DOWNLOADING)),
            R.andThen(() => onDownload(version)),
            R.andThen(() => setCurrentStep(DOWNLOAD_STEPS.LAUNCHING)),
            R.andThen(() => delay(1500)),
            R.andThen(() => setCurrentStep(DOWNLOAD_STEPS.COMPLETED)),
            R.otherwise((err) => {
              setError(String(err));
              setCurrentStep(DOWNLOAD_STEPS.ERROR);
            }),
            R.andThen(() => setIsProcessing(false)),
          )();
        },
      )(R.path(["version"], version));
    }, [version, onDownload, t]);

    const handleClose = useCallback(() => {
      R.unless(R.identity, () => onClose())(isProcessing);
    }, [isProcessing, onClose]);

    const handleCancel = useCallback(() => {
      R.when(isCancellableStep, () => onCancel())(currentStep);
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

    return R.ifElse(
      R.identity,
      () => {
        const showProgressBar = isProgressVisibleStep(currentStep);
        const stepTitle = getStepTitle(currentStep);
        const stepIcon = R.prop(currentStep, STEP_ICONS);

        return (
          <div className="modal-overlay">
            <div className="download-modal">
              <div className="modal-header">
                <h2 className="modal-title">
                  {R.replace(
                    "{version}",
                    R.pathOr("", ["version"], version),
                    R.pathOr(
                      `Install Mendix Studio Pro ${R.path(["version"], version)}`,
                      ["modals", "download", "installTitle"],
                      t,
                    ),
                  )}
                </h2>
                {R.ifElse(
                  R.not,
                  () => (
                    <button
                      className="modal-close"
                      onClick={handleClose}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  ),
                  R.always(null),
                )(isProcessing)}
              </div>

              <div className="modal-content-progress">
                {R.ifElse(
                  R.equals(DOWNLOAD_STEPS.CONFIRM),
                  () => (
                    <div className="confirm-content">
                      <div className="confirm-icon">🍓</div>
                      <div className="confirm-message">
                        <p>
                          {R.replace(
                            "{version}",
                            R.pathOr("", ["version"], version),
                            R.pathOr(
                              `This will download and install Mendix Studio Pro ${R.path(["version"], version)}`,
                              ["modals", "download", "description"],
                              t,
                            ),
                          )}
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
                  ),
                  R.always(null),
                )(currentStep)}

                {R.ifElse(
                  R.allPass([
                    () => R.equals(DOWNLOAD_STEPS.ERROR, currentStep),
                    () => R.isNotNil(error),
                  ]),
                  () => ErrorMessage(error, t),
                  R.always(null),
                )(null)}

                {R.ifElse(
                  R.identity,
                  () => (
                    <>
                      <span style={{ fontSize: "1.2rem", marginRight: "8px" }}>
                        {R.ifElse(
                          () =>
                            R.and(
                              isProcessing,
                              R.not(R.equals(DOWNLOAD_STEPS.COMPLETED, currentStep)),
                            ),
                          R.always("🍓"),
                          R.always(stepIcon),
                        )(null)}
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
                          {R.ifElse(
                            R.identity,
                            () => (
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
                            ),
                            R.always(null),
                          )(isProcessing)}
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
                  ),
                  R.always(null),
                )(showProgressBar)}

                {R.ifElse(
                  R.equals(DOWNLOAD_STEPS.COMPLETED),
                  () => (
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
                  ),
                  R.always(null),
                )(currentStep)}
              </div>

              <div className="modal-footer">
                {ActionButtons(
                  currentStep,
                  handleDownload,
                  handleCancel,
                  handleClose,
                  t,
                )}

                {R.ifElse(
                  R.identity,
                  () => (
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
                  ),
                  R.always(null),
                )(isProcessing)}
              </div>
            </div>
          </div>
        );
      },
      R.always(null),
    )(isOpen);
  },
);

DownloadModal.displayName = "DownloadModal";

export default DownloadModal;
