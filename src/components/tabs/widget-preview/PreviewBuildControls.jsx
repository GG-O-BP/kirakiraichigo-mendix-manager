import * as R from "ramda";
import { memo } from "react";

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
      <select
        value={packageManager}
        onChange={(e) => setPackageManager(e.target.value)}
        disabled={isBuilding}
        className="package-manager-select"
      >
        <option value="npm">npm</option>
        <option value="yarn">yarn</option>
        <option value="pnpm">pnpm</option>
        <option value="bun">bun</option>
      </select>
      <button
        className="run-preview-button"
        onClick={() => handleRunPreview(selectedWidget)}
        disabled={R.or(R.isNil(selectedWidget), isBuilding)}
      >
        <span className="button-icon">{isBuilding ? "\u23f3" : "\u25b6\ufe0f"}</span>
        {isBuilding ? "Building..." : "Run Preview"}
      </button>
    </div>
    {R.ifElse(
      R.complement(R.isNil),
      (error) => (
        <div className="build-error">
          <span className="error-icon">{"\u274c"}</span>
          <p>{error}</p>
        </div>
      ),
      R.always(null),
    )(buildError)}
  </>
));

PreviewBuildControls.displayName = "PreviewBuildControls";

export default PreviewBuildControls;
