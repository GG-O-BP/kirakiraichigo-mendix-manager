import * as v from "valibot";
import * as R from "ramda";

// ===== Package Manager Config Schema =====
export const packageManagerMethodSchema = v.picklist([
  "direct_node",
  "direct_command",
  "fnm_simple",
  "powershell_fnm",
  "powershell_simple",
]);

export const packageManagerConfigSchema = v.object({
  method: packageManagerMethodSchema,
  npm_path: v.optional(v.nullable(v.string())),
  node_path: v.optional(v.nullable(v.string())),
});

export const validatePackageManagerConfig = (data) => {
  const result = v.safeParse(packageManagerConfigSchema, data);
  return R.prop("success", result);
};

// ===== Version Filter Options Schema =====
export const versionFilterOptionsSchema = v.object({
  showOnlyDownloadable: v.boolean(),
  showLTSOnly: v.boolean(),
  showMTSOnly: v.boolean(),
  showBetaOnly: v.boolean(),
  searchTerm: v.string(),
});

export const validateVersionFilterOptions = (data) => {
  const result = v.safeParse(versionFilterOptionsSchema, data);
  return R.prop("success", result);
};

// ===== Selection Type Schema =====
export const selectionTypeSchema = v.picklist(["apps", "widgets", "versions"]);

export const validateSelectionType = (data) => {
  const result = v.safeParse(selectionTypeSchema, data);
  return R.prop("success", result);
};

// ===== Theme Metadata Schema =====
export const themeMetadataSchema = v.object({
  isLight: v.boolean(),
  isCustom: v.boolean(),
});

export const validateThemeMetadata = (data) => {
  const result = v.safeParse(themeMetadataSchema, data);
  return R.ifElse(
    R.prop("success"),
    R.prop("output"),
    R.always({ isLight: false, isCustom: true }),
  )(result);
};
