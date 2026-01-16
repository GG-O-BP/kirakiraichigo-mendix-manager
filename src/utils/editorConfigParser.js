import * as R from "ramda";

// ============= EditorConfig Parser =============
// This module parses and executes Mendix widget editorConfig.js files
// to enable dynamic property filtering based on current widget values.

// ============= Constants =============

const EDITOR_CONFIG_EXPORTS = ["getProperties", "check", "getPreview", "getCustomCaption"];

// ============= Pure Transformation Functions =============

// Transform a single property from Rust format to editorConfig format
const transformProperty = (prop) => ({
  key: R.prop("key", prop),
  type: R.prop("property_type", prop),
  caption: R.prop("caption", prop),
  description: R.prop("description", prop),
  defaultValue: R.prop("default_value", prop),
  required: R.prop("required", prop),
  options: R.prop("options", prop),
});

// Recursively transform a property group and its nested groups
const transformPropertyGroup = (group) => ({
  caption: R.prop("caption", group),
  properties: R.map(transformProperty, R.prop("properties", group) || []),
  propertyGroups: R.map(transformPropertyGroup, R.prop("property_groups", group) || []),
});

// Convert widget definition properties to defaultProperties format for getProperties
const transformToDefaultProperties = R.curry((widgetDefinition) => {
  const propertyGroups = R.prop("property_groups", widgetDefinition) || [];
  return R.map(transformPropertyGroup, propertyGroups);
});

// Transform flat properties (not in groups)
const transformFlatProperties = R.curry((widgetDefinition) => {
  const properties = R.prop("properties", widgetDefinition) || [];
  return R.map(transformProperty, properties);
});

// ============= EditorConfig Execution =============

// Parse editorConfig.js content and extract functions
const parseEditorConfig = (configContent) => {
  try {
    // Create a module-like environment
    const exports = {};
    const module = { exports };

    // Remove ES module syntax and convert to CommonJS-like format
    let processedContent = configContent
      // Remove export keywords
      .replace(/export\s+const\s+/g, "const ")
      .replace(/export\s+function\s+/g, "function ")
      .replace(/export\s+default\s+/g, "module.exports.default = ")
      // Handle named exports at the end
      .replace(/export\s*\{[^}]*\}/g, "");

    // Wrap in a function to capture local variables
    const wrappedContent = `
      (function(exports, module) {
        ${processedContent}

        // Capture exported functions
        if (typeof getProperties === 'function') exports.getProperties = getProperties;
        if (typeof check === 'function') exports.check = check;
        if (typeof getPreview === 'function') exports.getPreview = getPreview;
        if (typeof getCustomCaption === 'function') exports.getCustomCaption = getCustomCaption;

        return exports;
      })
    `;

    // Execute the wrapped code
    const executor = eval(wrappedContent);
    return executor(exports, module);
  } catch (error) {
    console.error("[EditorConfig Parser] Failed to parse config:", error);
    return null;
  }
};

// Execute getProperties function with current values
const executeGetProperties = R.curry((editorConfig, values, defaultProperties) => {
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

// Execute check function to validate values
const executeCheck = R.curry((editorConfig, values) => {
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

// ============= Property Filtering Logic =============

// Check if a property should be visible based on filtered properties
const isPropertyVisible = R.curry((filteredGroups, propertyKey) => {
  // Recursively check all groups for the property key
  const checkGroup = (group) => {
    const properties = R.prop("properties", group) || [];
    const propertyGroups = R.prop("propertyGroups", group) || [];

    // Check direct properties
    const foundInProperties = R.any(
      R.pipe(R.prop("key"), R.equals(propertyKey)),
      properties,
    );

    if (foundInProperties) return true;

    // Check nested groups
    return R.any(checkGroup, propertyGroups);
  };

  return R.any(checkGroup, filteredGroups);
});

// Filter properties based on editorConfig result
const filterPropertiesByConfig = R.curry((filteredGroups, allProperties) => {
  if (R.isEmpty(filteredGroups)) {
    return allProperties;
  }

  return R.filter(
    (prop) => isPropertyVisible(filteredGroups, R.prop("key", prop)),
    allProperties,
  );
});

// Extract all visible property keys from filtered groups
const extractVisiblePropertyKeys = R.curry((filteredGroups) => {
  const extractKeys = (group) => {
    const properties = R.prop("properties", group) || [];
    const propertyGroups = R.prop("propertyGroups", group) || [];

    const directKeys = R.map(R.prop("key"), properties);
    const nestedKeys = R.chain(extractKeys, propertyGroups);

    return R.concat(directKeys, nestedKeys);
  };

  return R.uniq(R.chain(extractKeys, filteredGroups));
});

// ============= Main API =============

// Create an editorConfig handler instance
export const createEditorConfigHandler = (configContent) => {
  const parsedConfig = configContent ? parseEditorConfig(configContent) : null;

  return {
    isAvailable: parsedConfig !== null,
    parsedConfig,

    // Get filtered properties based on current values
    getFilteredProperties: (values, widgetDefinition) => {
      if (!parsedConfig) {
        return null; // Return null to indicate no filtering
      }

      const defaultProperties = transformToDefaultProperties(widgetDefinition);
      return executeGetProperties(parsedConfig, values, defaultProperties);
    },

    // Get visible property keys based on current values
    getVisiblePropertyKeys: (values, widgetDefinition) => {
      if (!parsedConfig) {
        return null;
      }

      const defaultProperties = transformToDefaultProperties(widgetDefinition);
      const filteredProperties = executeGetProperties(parsedConfig, values, defaultProperties);
      return extractVisiblePropertyKeys(filteredProperties);
    },

    // Validate current values
    validate: (values) => {
      return executeCheck(parsedConfig, values);
    },
  };
};

// Filter parsed properties based on visible keys
export const filterParsedPropertiesByKeys = R.curry((visibleKeys, parsedProperties) => {
  if (!visibleKeys) {
    return parsedProperties; // No filtering if keys are null
  }

  return R.filter(
    (prop) => R.includes(R.prop("key", prop), visibleKeys),
    parsedProperties,
  );
});

// Transform widgetDefinition to format expected by editorConfig
export const widgetDefinitionToDefaultProperties = transformToDefaultProperties;

// Export individual functions for testing
export { parseEditorConfig, executeGetProperties, executeCheck, extractVisiblePropertyKeys };
