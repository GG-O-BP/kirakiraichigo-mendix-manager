import * as R from "ramda";
import { memo } from "react";
import PackageManagerSelector from "../../common/PackageManagerSelector";

const isInstallButtonDisabled = R.curry((isInstalling, selectedWidgets) =>
  R.or(isInstalling, R.equals(0, selectedWidgets.size)),
);

const isBuildDeployButtonDisabled = R.curry(
  (isBuilding, selectedWidgets, selectedApps) =>
    R.or(
      R.or(isBuilding, R.equals(0, selectedWidgets.size)),
      R.equals(0, selectedApps.size),
    ),
);

const renderSuccessfulWidget = R.curry((result, index) => (
  <div key={index} className="inline-result-item success">
    <span className="result-icon">✅</span>
    <span className="result-text">{R.prop("widget", result)}</span>
    <span className="result-details">
      → {R.pipe(R.prop("apps"), R.join(", "))(result)}
    </span>
  </div>
));

const renderFailedWidget = R.curry((result, index) => (
  <div key={index} className="inline-result-item failed">
    <span className="result-icon">❌</span>
    <span className="result-text">{R.prop("widget", result)}</span>
  </div>
));

const renderInlineResults = R.ifElse(
  R.propSatisfies(R.complement(R.isNil), "inlineResults"),
  ({ inlineResults, setInlineResults }) => {
    const successfulResults = R.pipe(
      R.propOr([], "successful"),
      R.addIndex(R.map)(renderSuccessfulWidget),
    )(inlineResults);

    const failedResults = R.pipe(
      R.propOr([], "failed"),
      R.addIndex(R.map)(renderFailedWidget),
    )(inlineResults);

    const hasResults = R.pipe(
      R.juxt([
        R.pipe(R.propOr([], "successful"), R.complement(R.isEmpty)),
        R.pipe(R.propOr([], "failed"), R.complement(R.isEmpty)),
      ]),
      R.any(R.identity),
    )(inlineResults);

    return R.ifElse(
      R.always(hasResults),
      R.always(
        <div className="inline-results-container">
          <div className="inline-results-header">
            <h4>Build & Deploy Results</h4>
            <button
              className="clear-results-button"
              onClick={() => setInlineResults(null)}
            >
              Clear
            </button>
          </div>
          <div className="inline-results-content">
            {successfulResults}
            {failedResults}
          </div>
        </div>,
      ),
      R.always(null),
    )();
  },
  R.always(null),
);

const BuildDeploySection = memo(({
  packageManager,
  setPackageManager,
  handleInstall,
  handleBuildDeploy,
  isInstalling,
  isBuilding,
  selectedWidgets,
  selectedApps,
  inlineResults,
  setInlineResults,
}) => (
  <div className="package-manager-section">
    <PackageManagerSelector
      packageManager={packageManager}
      setPackageManager={setPackageManager}
    />

    <button
      onClick={handleInstall}
      disabled={isInstallButtonDisabled(isInstalling, selectedWidgets)}
      className={`install-button install-button-full ${
        selectedWidgets.size > 0 ? "button-enabled" : "button-disabled"
      }`}
    >
      <span className="button-icon">{isInstalling ? "⏳" : "📦"}</span>
      {isInstalling
        ? "Installing..."
        : `Install (${selectedWidgets.size} widgets)`}
    </button>

    <button
      onClick={handleBuildDeploy}
      disabled={isBuildDeployButtonDisabled(
        isBuilding,
        selectedWidgets,
        selectedApps,
      )}
      className={`install-button build-deploy-button ${
        selectedWidgets.size > 0 && selectedApps.size > 0
          ? "button-enabled"
          : "button-disabled"
      }`}
    >
      <span className="button-icon">{isBuilding ? "⏳" : "🚀"}</span>
      {isBuilding
        ? "Building & Deploying..."
        : `Build + Deploy (${selectedWidgets.size} widgets → ${selectedApps.size} apps)`}
    </button>

    {renderInlineResults({ inlineResults, setInlineResults })}
  </div>
));

BuildDeploySection.displayName = "BuildDeploySection";

export default BuildDeploySection;
