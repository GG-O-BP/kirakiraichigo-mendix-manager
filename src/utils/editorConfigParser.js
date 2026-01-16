import * as R from "ramda";

const transformRustPropertyToEditorFormat = (prop) => ({
  key: R.prop("key", prop),
  type: R.prop("property_type", prop),
  caption: R.prop("caption", prop),
  description: R.prop("description", prop),
  defaultValue: R.prop("default_value", prop),
  required: R.prop("required", prop),
  options: R.prop("options", prop),
});

const transformPropertyGroupRecursively = (group) => ({
  caption: R.prop("caption", group),
  properties: R.map(transformRustPropertyToEditorFormat, R.prop("properties", group) || []),
  propertyGroups: R.map(transformPropertyGroupRecursively, R.prop("property_groups", group) || []),
});

const transformWidgetDefinitionToEditorFormat = R.curry((widgetDefinition) => {
  const propertyGroups = R.prop("property_groups", widgetDefinition) || [];
  return R.map(transformPropertyGroupRecursively, propertyGroups);
});

const transformFlatPropertiesToEditorFormat = R.curry((widgetDefinition) => {
  const properties = R.prop("properties", widgetDefinition) || [];
  return R.map(transformRustPropertyToEditorFormat, properties);
});

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

const isPropertyKeyInGroups = R.curry((filteredGroups, propertyKey) => {
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

const filterPropertiesByVisibility = R.curry((filteredGroups, allProperties) => {
  if (R.isEmpty(filteredGroups)) {
    return allProperties;
  }

  return R.filter(
    (prop) => isPropertyKeyInGroups(filteredGroups, R.prop("key", prop)),
    allProperties,
  );
});

const extractAllPropertyKeysFromGroups = R.curry((filteredGroups) => {
  const extractKeysFromGroup = (group) => {
    const properties = R.prop("properties", group) || [];
    const propertyGroups = R.prop("propertyGroups", group) || [];

    const directKeys = R.map(R.prop("key"), properties);
    const nestedKeys = R.chain(extractKeysFromGroup, propertyGroups);

    return R.concat(directKeys, nestedKeys);
  };

  return R.uniq(R.chain(extractKeysFromGroup, filteredGroups));
});

export const createEditorConfigHandler = (configContent) => {
  const parsedConfig = configContent ? parseEditorConfigToExecutableModule(configContent) : null;

  return {
    isAvailable: parsedConfig !== null,
    parsedConfig,

    getFilteredProperties: (values, widgetDefinition) => {
      if (!parsedConfig) {
        return null;
      }

      const defaultProperties = transformWidgetDefinitionToEditorFormat(widgetDefinition);
      return invokeGetPropertiesWithFallback(parsedConfig, values, defaultProperties);
    },

    getVisiblePropertyKeys: (values, widgetDefinition) => {
      if (!parsedConfig) {
        return null;
      }

      const defaultProperties = transformWidgetDefinitionToEditorFormat(widgetDefinition);
      const filteredProperties = invokeGetPropertiesWithFallback(parsedConfig, values, defaultProperties);
      return extractAllPropertyKeysFromGroups(filteredProperties);
    },

    validate: (values) => {
      return invokeCheckWithFallback(parsedConfig, values);
    },
  };
};

export const filterParsedPropertiesByKeys = R.curry((visibleKeys, parsedProperties) => {
  if (!visibleKeys) {
    return parsedProperties;
  }

  return R.filter(
    (prop) => R.includes(R.prop("key", prop), visibleKeys),
    parsedProperties,
  );
});

export const widgetDefinitionToDefaultProperties = transformWidgetDefinitionToEditorFormat;

export {
  parseEditorConfigToExecutableModule as parseEditorConfig,
  invokeGetPropertiesWithFallback as executeGetProperties,
  invokeCheckWithFallback as executeCheck,
  extractAllPropertyKeysFromGroups as extractVisiblePropertyKeys,
};
