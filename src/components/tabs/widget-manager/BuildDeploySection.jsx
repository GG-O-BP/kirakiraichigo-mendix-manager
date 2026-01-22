import * as R from "ramda";
import { memo } from "react";
import PackageManagerSelector from "../../common/PackageManagerSelector";
import InlineResults from "./InlineResults";
import { useI18n } from "../../../i18n/useI18n";

const isInstallButtonDisabled = R.curry((isInstalling, selectedWidgets) =>
  R.or(isInstalling, R.equals(0, selectedWidgets.size)),
);

const isBuildDeployButtonDisabled = R.curry(
  (isBuilding, isDeploying, selectedWidgets, selectedApps) =>
    R.or(
      R.or(R.or(isBuilding, isDeploying), R.equals(0, selectedWidgets.size)),
      R.equals(0, selectedApps.size),
    ),
);

const isDeployOnlyButtonDisabled = R.curry(
  (isBuilding, isDeploying, selectedWidgets, selectedApps, allDistExist) =>
    R.or(
      R.or(
        R.or(R.or(isBuilding, isDeploying), R.equals(0, selectedWidgets.size)),
        R.equals(0, selectedApps.size),
      ),
      R.not(allDistExist),
    ),
);

const BuildDeploySection = memo(({
  packageManager,
  setPackageManager,
  handleInstall,
  handleBuildDeploy,
  handleDeployOnly,
  isInstalling,
  isBuilding,
  isDeploying,
  selectedWidgets,
  selectedApps,
  inlineResults,
  setInlineResults,
  allDistExist,
  lastOperationType,
}) => {
  const { t } = useI18n();

  const getInstallText = () =>
    isInstalling
      ? R.pathOr("Installing...", ["widgets", "installing"], t)
      : R.pathOr(`Install (${selectedWidgets.size} widgets)`, ["widgets", "install"], t)
          .replace("{count}", selectedWidgets.size);

  const getBuildDeployText = () =>
    R.cond([
      [R.always(isBuilding), R.always(R.pathOr("Building & Deploying...", ["widgets", "buildingAndDeploying"], t))],
      [R.always(isDeploying), R.always(R.pathOr("Deploying...", ["widgets", "deploying"], t))],
      [R.T, R.always(
        R.pathOr(`Build + Deploy (${selectedWidgets.size} widgets → ${selectedApps.size} apps)`, ["widgets", "buildDeploy"], t)
          .replace("{widgetCount}", selectedWidgets.size)
          .replace("{appCount}", selectedApps.size)
      )],
    ])();

  const getDeployOnlyText = () =>
    R.cond([
      [R.always(isBuilding), R.always(R.pathOr("Building & Deploying...", ["widgets", "buildingAndDeploying"], t))],
      [R.always(isDeploying), R.always(R.pathOr("Deploying...", ["widgets", "deploying"], t))],
      [R.T, R.always(
        R.pathOr(`Deploy Only (${selectedWidgets.size} widgets → ${selectedApps.size} apps)`, ["widgets", "deployOnly"], t)
          .replace("{widgetCount}", selectedWidgets.size)
          .replace("{appCount}", selectedApps.size)
      )],
    ])();

  return (
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
        {getInstallText()}
      </button>

      <button
        onClick={handleBuildDeploy}
        disabled={isBuildDeployButtonDisabled(
          isBuilding,
          isDeploying,
          selectedWidgets,
          selectedApps,
        )}
        className={`install-button build-deploy-button ${
          R.and(R.gt(selectedWidgets.size, 0), R.gt(selectedApps.size, 0))
            ? "button-enabled"
            : "button-disabled"
        }`}
      >
        <span className="button-icon">{R.or(isBuilding, isDeploying) ? "⏳" : "🚀"}</span>
        {getBuildDeployText()}
      </button>

      <button
        onClick={handleDeployOnly}
        disabled={isDeployOnlyButtonDisabled(
          isBuilding,
          isDeploying,
          selectedWidgets,
          selectedApps,
          allDistExist,
        )}
        className={`install-button deploy-only-button ${
          R.and(
            R.and(R.gt(selectedWidgets.size, 0), R.gt(selectedApps.size, 0)),
            allDistExist,
          )
            ? "button-enabled"
            : "button-disabled"
        }`}
      >
        <span className="button-icon">{R.or(isBuilding, isDeploying) ? "⏳" : "📤"}</span>
        {getDeployOnlyText()}
      </button>

      <InlineResults
        inlineResults={inlineResults}
        setInlineResults={setInlineResults}
        isBuilding={isBuilding}
        isDeploying={isDeploying}
        lastOperationType={lastOperationType}
      />
    </div>
  );
});

BuildDeploySection.displayName = "BuildDeploySection";

export default BuildDeploySection;
