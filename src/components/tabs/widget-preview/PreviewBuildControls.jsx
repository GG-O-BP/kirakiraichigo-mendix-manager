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
  handleRunPreview,
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
        onClick={() => handleRunPreview(selectedWidget)}
        disabled={R.or(R.isNil(selectedWidget), isBuilding)}
      >
        <span className="button-icon">{isBuilding ? "⏳" : "▶️"}</span>
        {isBuilding ? "Building..." : "Run Preview"}
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
