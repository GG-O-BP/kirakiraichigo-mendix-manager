import { memo } from "react";
import WidgetPreviewFrame from "../../common/WidgetPreviewFrame";

const PreviewPanel = memo(({ previewData, properties }) => (
  <div className="preview-right">
    {previewData ? (
      <WidgetPreviewFrame
        bundle={previewData.bundle}
        css={previewData.css}
        widgetName={previewData.widgetName}
        widgetId={previewData.widgetId}
        properties={properties}
      />
    ) : (
      <div className="preview-instructions">
        <span className="preview-emoji">🍓</span>
        <p className="preview-message">
          Pick a widget, click Run Preview,
          <br />
          and watch the magic happen!
        </p>
      </div>
    )}
  </div>
));

PreviewPanel.displayName = "PreviewPanel";

export default PreviewPanel;
