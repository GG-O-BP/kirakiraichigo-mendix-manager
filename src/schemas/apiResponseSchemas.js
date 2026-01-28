import * as v from "valibot";
import * as R from "ramda";

// ===== Mendix Version Schema =====
export const mendixVersionSchema = v.object({
  version: v.string(),
  path: v.string(),
  exe_path: v.string(),
  install_date: v.optional(v.nullable(v.string())),
  is_valid: v.boolean(),
});

export const validateMendixVersions = (data) => {
  const result = v.safeParse(v.array(mendixVersionSchema), data);
  return R.ifElse(
    R.prop("success"),
    R.prop("output"),
    R.always([]),
  )(result);
};

// ===== Mendix App Schema =====
export const mendixAppSchema = v.object({
  name: v.string(),
  path: v.string(),
  version: v.optional(v.nullable(v.string())),
  last_modified: v.optional(v.nullable(v.string())),
  is_valid: v.boolean(),
});

export const validateMendixApps = (data) => {
  const result = v.safeParse(v.array(mendixAppSchema), data);
  return R.ifElse(
    R.prop("success"),
    R.prop("output"),
    R.always([]),
  )(result);
};

// ===== Widget Schema =====
export const widgetSchema = v.object({
  id: v.string(),
  caption: v.string(),
  path: v.string(),
});

export const validateWidgets = (data) => {
  const result = v.safeParse(v.array(widgetSchema), data);
  return R.ifElse(
    R.prop("success"),
    R.prop("output"),
    R.always([]),
  )(result);
};

// ===== Downloadable Version Schema =====
export const downloadableVersionSchema = v.object({
  version: v.string(),
  download_url: v.optional(v.nullable(v.string())),
  release_date: v.optional(v.nullable(v.string())),
  is_lts: v.boolean(),
  is_beta: v.boolean(),
  is_mts: v.boolean(),
  is_latest: v.boolean(),
});

export const validateDownloadableVersions = (data) => {
  const result = v.safeParse(v.array(downloadableVersionSchema), data);
  return R.ifElse(
    R.prop("success"),
    R.prop("output"),
    R.always([]),
  )(result);
};

// ===== Build Deploy Result Schema =====
export const buildResultItemSchema = v.object({
  widget_id: v.string(),
  widget_caption: v.string(),
  app_name: v.string(),
  app_path: v.string(),
});

export const buildDeployResultSchema = v.object({
  successful: v.array(buildResultItemSchema),
  failed: v.array(buildResultItemSchema),
});

export const validateBuildDeployResult = (data) => {
  const result = v.safeParse(buildDeployResultSchema, data);
  return R.ifElse(
    R.prop("success"),
    R.prop("output"),
    R.always({ successful: [], failed: [] }),
  )(result);
};
