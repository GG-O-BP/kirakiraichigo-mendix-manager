import * as R from "ramda";
import { memo } from "react";
import WidgetPreviewFrame from "../../common/WidgetPreviewFrame";

const PreviewPanel = memo(({ previewData, properties, widgetDefinition, isBuilding }) => (
  <div className="preview-right">
    {R.cond([
      [
        R.always(isBuilding),
        R.always(
          <div className="empty-state">
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
            widgetDefinition={widgetDefinition}
          />
        ),
      ],
      [
        R.T,
        R.always(
          <div className="empty-state">
            <span className="empty-state-icon">🍓</span>
            <p className="empty-state-message">
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
