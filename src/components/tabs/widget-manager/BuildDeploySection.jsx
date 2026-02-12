import * as R from "ramda";
import { memo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import PackageManagerSelector from "../../common/PackageManagerSelector";
import InlineResults from "./InlineResults";
import { useI18n } from "../../../i18n/useI18n";

const invokeCollectionCount = async (items) =>
  invoke("collection_count", { items });

const isInstallButtonDisabled = R.curry((isInstalling, widgetCount) =>
  R.or(isInstalling, R.equals(0, widgetCount)),
);

const isBuildDeployButtonDisabled = R.curry(
  (isBuilding, isDeploying, widgetCount, appCount) =>
    R.or(
      R.or(R.or(isBuilding, isDeploying), R.equals(0, widgetCount)),
      R.equals(0, appCount),
    ),
);

const isDeployOnlyButtonDisabled = R.curry(
  (isBuilding, isDeploying, widgetCount, appCount, allDistExist) =>
    R.or(
      R.or(
        R.or(R.or(isBuilding, isDeploying), R.equals(0, widgetCount)),
        R.equals(0, appCount),
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
  const [widgetCount, setWidgetCount] = useState(0);
  const [appCount, setAppCount] = useState(0);

  useEffect(() => {
    const updateCounts = async () => {
      const widgetItems = Array.from(selectedWidgets);
      const appItems = Array.from(selectedApps);
      const [wCount, aCount] = await Promise.all([
        invokeCollectionCount(widgetItems),
        invokeCollectionCount(appItems),
      ]);
      setWidgetCount(wCount);
      setAppCount(aCount);
    };
    updateCounts();
  }, [selectedWidgets, selectedApps]);

  const getInstallText = () =>
    isInstalling
      ? R.pathOr("Installing...", ["widgets", "installing"], t)
      : R.pathOr(`Install (${widgetCount} widgets)`, ["widgets", "install"], t)
          .replace("{count}", widgetCount);

  const getBuildDeployText = () =>
    R.cond([
      [R.always(isBuilding), R.always(R.pathOr("Building & Deploying...", ["widgets", "buildingAndDeploying"], t))],
      [R.always(isDeploying), R.always(R.pathOr("Deploying...", ["widgets", "deploying"], t))],
      [R.T, R.always(
        R.pathOr(`Build + Deploy (${widgetCount} widgets → ${appCount} apps)`, ["widgets", "buildDeploy"], t)
          .replace("{widgetCount}", widgetCount)
          .replace("{appCount}", appCount)
      )],
    ])();

  const getDeployOnlyText = () =>
    R.cond([
      [R.always(isBuilding), R.always(R.pathOr("Building & Deploying...", ["widgets", "buildingAndDeploying"], t))],
      [R.always(isDeploying), R.always(R.pathOr("Deploying...", ["widgets", "deploying"], t))],
      [R.T, R.always(
        R.pathOr(`Deploy Only (${widgetCount} widgets → ${appCount} apps)`, ["widgets", "deployOnly"], t)
          .replace("{widgetCount}", widgetCount)
          .replace("{appCount}", appCount)
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
        disabled={isInstallButtonDisabled(isInstalling, widgetCount)}
        className={`install-button install-button-full ${
          R.gt(widgetCount, 0) ? "button-enabled" : "button-disabled"
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
          widgetCount,
          appCount,
        )}
        className={`install-button build-deploy-button ${
          R.and(R.gt(widgetCount, 0), R.gt(appCount, 0))
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
          widgetCount,
          appCount,
          allDistExist,
        )}
        className={`install-button deploy-only-button ${
          R.and(
            R.and(R.gt(widgetCount, 0), R.gt(appCount, 0)),
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
