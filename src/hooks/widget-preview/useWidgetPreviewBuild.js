import * as R from "ramda";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import useSWRMutation from "swr/mutation";
import { invoke } from "@tauri-apps/api/core";
import { SWR_KEYS } from "../../lib/swr";
import {
  previewDataCacheAtom,
  buildErrorAtom,
  currentPreviewDataAtom,
  setPreviewDataAtom,
} from "../../atoms";

const buildAndRunPreview = async (_, { arg }) => {
  const { widgetPath, packageManager } = arg;
  return invoke("build_and_run_preview", { widgetPath, packageManager });
};

const runPreviewOnly = async (_, { arg }) => {
  const { widgetPath } = arg;
  return invoke("run_widget_preview_only", { widgetPath });
};

export function useWidgetPreviewBuild({ selectedWidgetForPreview, packageManager }) {
  const previewData = useAtomValue(currentPreviewDataAtom);
  const setPreviewData = useSetAtom(setPreviewDataAtom);
  const [buildError, setBuildError] = useAtom(buildErrorAtom);

  const { trigger: triggerBuild, isMutating: isBuildingPreview } = useSWRMutation(
    SWR_KEYS.WIDGET_PREVIEW_BUILD,
    buildAndRunPreview,
  );

  const { trigger: triggerRun, isMutating: isRunningPreview } = useSWRMutation(
    SWR_KEYS.WIDGET_PREVIEW_RUN,
    runPreviewOnly,
  );

  const processResponse = (widgetId, response) => {
    R.ifElse(
      R.prop("success"),
      R.pipe(
        R.tap(() => setBuildError(null)),
        (res) => setPreviewData({
          widgetId,
          data: {
            bundle: R.prop("bundle_content", res),
            css: R.prop("css_content", res),
            widgetName: R.prop("widget_name", res),
            widgetId: R.prop("widget_id", res),
          },
        }),
      ),
      R.pipe(
        R.tap((res) => setBuildError(R.propOr("Build failed", "error", res))),
        R.tap(() => setPreviewData({ widgetId, data: null })),
      ),
    )(response);
  };

  const runPreviewOperation = R.curry((logLabel, executeTrigger, selectedWidget) =>
    R.when(
      R.isNotNil,
      (widget) => {
        const widgetId = R.prop("id", widget);
        setBuildError(null);
        return R.pipe(
          () => executeTrigger(widget),
          R.andThen((response) => processResponse(widgetId, response)),
          R.otherwise(
            R.pipe(
              R.tap((error) => console.error(logLabel, error)),
              R.tap((error) => setBuildError(String(error))),
              R.tap(() => setPreviewData({ widgetId, data: null })),
            ),
          ),
        )();
      },
    )(selectedWidget),
  );

  const handleBuildAndRun = runPreviewOperation(
    "[Widget Preview] Error:",
    (widget) => triggerBuild({ widgetPath: R.prop("path", widget), packageManager }),
  );

  const handleRunOnly = runPreviewOperation(
    "[Widget Preview] Run Only Error:",
    (widget) => triggerRun({ widgetPath: R.prop("path", widget) }),
  );

  return {
    previewData,
    handleBuildAndRun,
    handleRunOnly,
    isBuilding: R.or(isBuildingPreview, isRunningPreview),
    buildError,
  };
}
