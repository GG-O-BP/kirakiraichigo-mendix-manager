import * as R from "ramda";

const deepClonePropertyGroups = (propertyGroups) => {
  return JSON.parse(JSON.stringify(propertyGroups));
};

const extractPropertyGroupsFromDefinition = R.curry((widgetDefinition) => {
  const propertyGroups = R.propOr([], "propertyGroups", widgetDefinition);
  return deepClonePropertyGroups(propertyGroups);
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

const createMendixUtilsInjection = (configContent) => {
  const hasHidePropertyIn = /\bhidePropertyIn\s*=/.test(configContent);
  const hasHidePropertiesIn = /\bhidePropertiesIn\s*=/.test(configContent);

  let injection = "";

  if (!hasHidePropertyIn) {
    injection += `
      var hidePropertyIn = function(propertyGroups, propertyName) {
        var hideInGroup = function(group) {
          var properties = (group && group.properties) || [];
          var filteredProperties = properties.filter(function(p) {
            return p && p.key !== propertyName;
          });
          var nestedGroups = (group && group.propertyGroups) || [];
          var filteredNestedGroups = nestedGroups.map(hideInGroup);
          return Object.assign({}, group, {
            properties: filteredProperties,
            propertyGroups: filteredNestedGroups
          });
        };
        return propertyGroups.map(hideInGroup);
      };
    `;
  }

  if (!hasHidePropertiesIn) {
    injection += `
      var hidePropertiesIn = function(propertyGroups, propertyNames) {
        return propertyNames.reduce(function(groups, propName) {
          return hidePropertyIn(groups, propName);
        }, propertyGroups);
      };
    `;
  }

  return injection;
};

const parseEditorConfigToExecutableModule = (configContent) => {
  try {
    const exports = {};
    const module = { exports };

    let processedContent = configContent
      .replace(/import\s+\{[^}]*\}\s+from\s+['"][^'"]*['"]\s*;?/g, "")
      .replace(/import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]*['"]\s*;?/g, "")
      .replace(/import\s+\w+\s+from\s+['"][^'"]*['"]\s*;?/g, "")
      .replace(/export\s+const\s+/g, "const ")
      .replace(/export\s+function\s+/g, "function ")
      .replace(/export\s+default\s+/g, "module.exports.default = ")
      .replace(/export\s*\{[^}]*\}/g, "");

    const utilsInjection = createMendixUtilsInjection(processedContent);

    const wrappedContent = `
      (function(exports, module) {
        ${utilsInjection}
        ${processedContent}

        if (typeof getProperties === 'function') exports.getProperties = getProperties;
        if (typeof check === 'function') exports.check = check;
        if (typeof getPreview === 'function') exports.getPreview = getPreview;
        if (typeof getCustomCaption === 'function') exports.getCustomCaption = getCustomCaption;

        return exports;
      })
    `;

    const executor = eval(wrappedContent);
    const result = executor(exports, module);
    return result;
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
    const result = editorConfig.getProperties(values, defaultProperties);
    return result;
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
