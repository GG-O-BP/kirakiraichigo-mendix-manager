import * as R from "ramda";
import { invoke } from "@tauri-apps/api/core";

export const invokeCreateWidget = R.curry((caption, path) =>
  invoke("create_widget", { caption, path }),
);

export const invokeCreateCatastrophicErrorResult = (error) =>
  invoke("create_catastrophic_error_result", { errorMessage: error.toString() });
