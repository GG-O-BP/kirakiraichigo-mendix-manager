import * as R from "ramda";
import { invoke } from "@tauri-apps/api/core";

export const invokeCreateWidget = R.curry((caption, path) =>
  invoke("create_widget", { caption, path }),
);

export const invokeHasBuildFailures = async (result) => {
  const failed = R.propOr([], "failed", result);
  return invoke("has_build_failures", { failed });
};

export const invokeCreateCatastrophicErrorResult = (error) =>
  invoke("create_catastrophic_error_result", { errorMessage: error.toString() });
