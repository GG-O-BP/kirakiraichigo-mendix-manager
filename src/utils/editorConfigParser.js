import * as R from "ramda";

const extractPropertyGroupsFromDefinition = R.curry((widgetDefinition) => {
  return R.propOr([], "propertyGroups", widgetDefinition);
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

export const createEditorConfigHandler = (configContent) => {
  const parsedConfig = configContent ? parseEditorConfigToExecutableModule(configContent) : null;

  return {
    isAvailable: parsedConfig !== null,
    parsedConfig,

    getFilteredProperties: (values, widgetDefinition) => {
      if (!parsedConfig) {
        return null;
      }

      const defaultProperties = extractPropertyGroupsFromDefinition(widgetDefinition);
      return invokeGetPropertiesWithFallback(parsedConfig, values, defaultProperties);
    },

    getVisiblePropertyKeys: (values, widgetDefinition) => {
      if (!parsedConfig) {
        return null;
      }

      const defaultProperties = extractPropertyGroupsFromDefinition(widgetDefinition);
      const filteredProperties = invokeGetPropertiesWithFallback(parsedConfig, values, defaultProperties);
      return extractAllPropertyKeysFromGroupsInternal(filteredProperties);
    },

    validate: (values) => {
      return invokeCheckWithFallback(parsedConfig, values);
    },
  };
};
