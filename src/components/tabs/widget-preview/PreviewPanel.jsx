import * as R from "ramda";
import { memo } from "react";
import WidgetPreviewFrame from "../../common/WidgetPreviewFrame";

const PreviewPanel = memo(({ previewData, properties, isBuilding }) => (
  <div className="preview-right">
    {R.cond([
      [
        R.always(isBuilding),
        R.always(
          <div className="preview-instructions">
            <div className="build-progress-container">
              <progress className="build-progress-bar" />
              <span className="build-progress-text">Building widget...</span>
            </div>
          </div>
        ),
      ],
      [
        R.always(previewData),
        R.always(
          <WidgetPreviewFrame
            bundle={previewData?.bundle}
            css={previewData?.css}
            widgetName={previewData?.widgetName}
            widgetId={previewData?.widgetId}
            properties={properties}
          />
        ),
      ],
      [
        R.T,
        R.always(
          <div className="preview-instructions">
            <span className="preview-emoji">🍓</span>
            <p className="preview-message">
              Pick a widget, click Run Preview,
              <br />
              and watch the magic happen!
            </p>
          </div>
        ),
      ],
    ])()}
  </div>
));

PreviewPanel.displayName = "PreviewPanel";

export default PreviewPanel;
