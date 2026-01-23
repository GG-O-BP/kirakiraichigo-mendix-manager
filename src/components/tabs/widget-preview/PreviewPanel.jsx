import * as R from "ramda";
import { memo } from "react";
import WidgetPreviewFrame from "../../common/WidgetPreviewFrame";
import { useI18n } from "../../../i18n/useI18n";

const PreviewPanel = memo(({ previewData, properties, widgetDefinition, isBuilding, onDatasourceCommit }) => {
  const { t } = useI18n();

  return (
    <div className="preview-right">
      {R.cond([
        [
          R.always(isBuilding),
          R.always(
            <div className="empty-state">
              <div className="build-progress-container">
                <progress className="build-progress-bar" />
                <span className="build-progress-text">
                  {R.pathOr("Building widget~", ["preview", "buildingWidget"], t)}
                </span>
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
              onDatasourceCommit={onDatasourceCommit}
            />
          ),
        ],
        [
          R.T,
          R.always(
            <div className="empty-state">
              <span className="empty-state-icon">🍓</span>
              <p className="empty-state-message">
                {R.pathOr("Pick a widget, click Run Preview~\nand watch the magic happen! Hehe", ["preview", "emptyState"], t)
                  .split("\n")
                  .map((line, i) => (
                    <span key={i}>
                      {line}
                      {i === 0 && <br />}
                    </span>
                  ))}
              </p>
            </div>
          ),
        ],
      ])()}
    </div>
  );
});

PreviewPanel.displayName = "PreviewPanel";

export default PreviewPanel;
