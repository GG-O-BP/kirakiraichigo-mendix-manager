import * as R from "ramda";
import { invoke } from "@tauri-apps/api/core";

export const createWidget = R.curry((caption, path) => ({
  id: Date.now().toString(),
  caption,
  path,
}));

export const invokeHasBuildFailures = async (result) => {
  const failed = R.propOr([], "failed", result);
  return invoke("has_build_failures", { failed });
};

export const createCatastrophicErrorResult = R.curry((error) => ({
  successful: [],
  failed: [
    {
      widget: "All widgets",
      error: error.toString(),
    },
  ],
}));
