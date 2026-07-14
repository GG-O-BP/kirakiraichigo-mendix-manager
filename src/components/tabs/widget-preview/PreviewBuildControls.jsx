import * as R from "ramda";
import { memo } from "react";
import Dropdown from "../../common/Dropdown";

const PACKAGE_MANAGER_OPTIONS = ["npm", "yarn", "pnpm", "bun"];

const PreviewBuildControls = memo(({
  selectedWidget,
  packageManager,
  setPackageManager,
  isBuilding,
  buildError,
  handleBuildAndRun,
  handleRunOnly,
  distExists,
}) => (
  <>
    <div className="preview-controls">
      <Dropdown
        value={packageManager}
        onChange={setPackageManager}
        options={PACKAGE_MANAGER_OPTIONS}
        disabled={isBuilding}
      />
      <button
        className="run-preview-button"
        onClick={() => handleBuildAndRun(selectedWidget)}
        disabled={R.or(R.isNil(selectedWidget), isBuilding)}
      >
        <span className="button-icon">
          {R.ifElse(R.identity, R.always("⏳"), R.always("🔨▶️"))(isBuilding)}
        </span>
      </button>
      <button
        className="run-only-button"
        onClick={() => handleRunOnly(selectedWidget)}
        disabled={R.or(R.or(R.isNil(selectedWidget), isBuilding), R.not(distExists))}
      >
        <span className="button-icon">
          {R.ifElse(R.identity, R.always("⏳"), R.always("▶️"))(isBuilding)}
        </span>
      </button>
    </div>
    {R.ifElse(
      R.complement(R.isNil),
      (error) => (
        <div className="build-error">
          <span className="error-icon">❌</span>
          <p>{error}</p>
        </div>
      ),
      R.always(null),
    )(buildError)}
  </>
));

PreviewBuildControls.displayName = "PreviewBuildControls";

export default PreviewBuildControls;
