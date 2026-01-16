import * as R from "ramda";
import { invoke } from "@tauri-apps/api/core";

// ============= Rust Backend Functions (Primary API) =============

// Transform widget definition to editor format (Rust backend)
export const transformWidgetDefinitionToEditorFormat = async (widgetPath) =>
  invoke("transform_widget_definition_to_editor_format", { widgetPath });

// Extract all property keys from groups (Rust backend)
export const extractAllPropertyKeysFromGroups = async (groups) =>
  invoke("extract_all_property_keys_from_groups", { groups });

// Filter parsed properties by keys (Rust backend)
export const filterParsedPropertiesByKeys = async (visibleKeys, parsedProperties) =>
  invoke("filter_parsed_properties_by_keys", { visibleKeys, parsedProperties });

// Check if property key exists in groups (Rust backend)
export const isPropertyKeyInGroups = async (groups, propertyKey) =>
  invoke("is_property_key_in_groups", { groups, propertyKey });

// ============= Internal JS Functions (for eval-based editorConfig) =============
// These functions are required for JavaScript eval() execution and cannot be moved to Rust

const transformRustPropertyToEditorFormatInternal = (prop) => ({
  key: R.prop("key", prop),
  type: R.prop("property_type", prop),
  caption: R.prop("caption", prop),
  description: R.prop("description", prop),
  defaultValue: R.prop("default_value", prop),
  required: R.prop("required", prop),
  options: R.prop("options", prop),
});

const transformPropertyGroupRecursivelyInternal = (group) => ({
  caption: R.prop("caption", group),
  properties: R.map(transformRustPropertyToEditorFormatInternal, R.prop("properties", group) || []),
  propertyGroups: R.map(transformPropertyGroupRecursivelyInternal, R.prop("property_groups", group) || []),
});

const transformWidgetDefinitionToEditorFormatInternal = R.curry((widgetDefinition) => {
  const propertyGroups = R.prop("property_groups", widgetDefinition) || [];
  return R.map(transformPropertyGroupRecursivelyInternal, propertyGroups);
});

const isPropertyKeyInGroupsInternal = R.curry((filteredGroups, propertyKey) => {
  const searchPropertyKeyInGroup = (group) => {
    const properties = R.prop("properties", group) || [];
    const propertyGroups = R.prop("propertyGroups", group) || [];

    const foundInDirectProperties = R.any(
      R.pipe(R.prop("key"), R.equals(propertyKey)),
      properties,
    );

    if (foundInDirectProperties) return true;

    return R.any(searchPropertyKeyInGroup, propertyGroups);
  };

  return R.any(searchPropertyKeyInGroup, filteredGroups);
});

const extractAllPropertyKeysFromGroupsInternal = R.curry((filteredGroups) => {
  const extractKeysFromGroup = (group) => {
    const properties = R.prop("properties", group) || [];
    const propertyGroups = R.prop("propertyGroups", group) || [];

    const directKeys = R.map(R.prop("key"), properties);
    const nestedKeys = R.chain(extractKeysFromGroup, propertyGroups);

    return R.concat(directKeys, nestedKeys);
  };

  return R.uniq(R.chain(extractKeysFromGroup, filteredGroups));
});

// ============= EditorConfig JS Execution (Cannot be moved to Rust) =============

const parseEditorConfigToExecutableModule = (configContent) => {
  try {
    const exports = {};
    const module = { exports };

    let processedContent = configContent
      .replace(/export\s+const\s+/g, "const ")
      .replace(/export\s+function\s+/g, "function ")
      .replace(/export\s+default\s+/g, "module.exports.default = ")
      .replace(/export\s*\{[^}]*\}/g, "");

    const wrappedContent = `
      (function(exports, module) {
        ${processedContent}

        if (typeof getProperties === 'function') exports.getProperties = getProperties;
        if (typeof check === 'function') exports.check = check;
        if (typeof getPreview === 'function') exports.getPreview = getPreview;
        if (typeof getCustomCaption === 'function') exports.getCustomCaption = getCustomCaption;

        return exports;
      })
    `;

    const executor = eval(wrappedContent);
    return executor(exports, module);
  } catch (error) {
    console.error("[EditorConfig Parser] Failed to parse config:", error);
    return null;
  }
};

const invokeGetPropertiesWithFallback = R.curry((editorConfig, values, defaultProperties) => {
  if (!editorConfig || typeof editorConfig.getProperties !== "function") {
    return defaultProperties;
  }

  try {
    return editorConfig.getProperties(values, defaultProperties);
  } catch (error) {
    console.error("[EditorConfig Parser] Failed to execute getProperties:", error);
    return defaultProperties;
  }
});

const invokeCheckWithFallback = R.curry((editorConfig, values) => {
  if (!editorConfig || typeof editorConfig.check !== "function") {
    return [];
  }

  try {
    return editorConfig.check(values);
  } catch (error) {
    console.error("[EditorConfig Parser] Failed to execute check:", error);
    return [];
  }
});

// Creates a handler for editorConfig that uses JavaScript eval
// This function CANNOT be moved to Rust as it requires JavaScript runtime execution
export const createEditorConfigHandler = (configContent) => {
  const parsedConfig = configContent ? parseEditorConfigToExecutableModule(configContent) : null;

  return {
    isAvailable: parsedConfig !== null,
    parsedConfig,

    getFilteredProperties: (values, widgetDefinition) => {
      if (!parsedConfig) {
        return null;
      }

      const defaultProperties = transformWidgetDefinitionToEditorFormatInternal(widgetDefinition);
      return invokeGetPropertiesWithFallback(parsedConfig, values, defaultProperties);
    },

    getVisiblePropertyKeys: (values, widgetDefinition) => {
      if (!parsedConfig) {
        return null;
      }

      const defaultProperties = transformWidgetDefinitionToEditorFormatInternal(widgetDefinition);
      const filteredProperties = invokeGetPropertiesWithFallback(parsedConfig, values, defaultProperties);
      return extractAllPropertyKeysFromGroupsInternal(filteredProperties);
    },

    validate: (values) => {
      return invokeCheckWithFallback(parsedConfig, values);
    },
  };
};

// Export internal sync version for cases where it's needed (e.g., within createEditorConfigHandler)
export const widgetDefinitionToDefaultProperties = transformWidgetDefinitionToEditorFormatInternal;
