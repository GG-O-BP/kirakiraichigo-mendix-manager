import * as R from "ramda";
import { memo } from "react";
import PackageManagerSelector from "../../common/PackageManagerSelector";
import InlineResults from "./InlineResults";

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

    <InlineResults
      inlineResults={inlineResults}
      setInlineResults={setInlineResults}
      isBuilding={isBuilding}
    />
  </div>
));

BuildDeploySection.displayName = "BuildDeploySection";

export default BuildDeploySection;
