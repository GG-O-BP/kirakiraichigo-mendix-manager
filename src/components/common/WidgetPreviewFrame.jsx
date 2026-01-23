import { useEffect, useRef, useCallback } from "react";

const WidgetPreviewFrame = ({ bundle, css, widgetName, widgetId, properties, widgetDefinition, onDatasourceCommit }) => {
  const iframeRef = useRef(null);
  const iframeReadyRef = useRef(false);
  const bundleRef = useRef(null);

  const sendPropertiesToIframe = useCallback((props, definition) => {
    if (!iframeRef.current || !iframeReadyRef.current) return;

    const iframe = iframeRef.current;
    iframe.contentWindow?.postMessage(
      { type: "UPDATE_PROPERTIES", properties: props, widgetDefinition: definition },
      "*"
    );
  }, []);

  useEffect(() => {
    if (!iframeRef.current || !bundle) return;

    if (bundleRef.current === bundle) {
      return;
    }
    bundleRef.current = bundle;
    iframeReadyRef.current = false;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    const safeWidgetName = (widgetName || "Widget").replace(/'/g, "\\'");
    const safeWidgetId = (widgetId || "").replace(/'/g, "\\'");
    const safeProperties = JSON.stringify(properties || {});
    const safeWidgetDefinition = JSON.stringify(widgetDefinition || {});
    const safeBundle = bundle;
    const safeCss = css || "";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Widget Preview - ${safeWidgetName}</title>
          <style>
            * {
              box-sizing: border-box;
            }
            html, body, #widget-root {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              background: white;
            }
            .preview-error {
              color: #d32f2f;
              padding: 16px;
              background: #ffebee;
              border-radius: 4px;
              border-left: 4px solid #d32f2f;
            }
            .preview-loading {
              text-align: center;
              padding: 32px;
              color: #666;
            }
          </style>
          <style>
            ${safeCss}
          </style>
        </head>
        <body>
          <div id="widget-root">
            <div class="preview-loading">Loading widget...</div>
          </div>

          <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js"></script>

          <script>
            (function() {
              try {
                window.React = React;
                window.ReactDOM = ReactDOM;

                // Rollup CommonJS interop helpers
                window.React__default = React;
                window.ReactDOM__default = ReactDOM;
                window['react'] = React;
                window['react-dom'] = ReactDOM;

                const jsxRuntime = {
                  jsx: React.createElement,
                  jsxs: React.createElement,
                  Fragment: React.Fragment,
                };
                window.jsxRuntime = jsxRuntime;
                window['react/jsx-runtime'] = jsxRuntime;

                // Rollup interop helper functions
                window._interopDefaultLegacy = function(e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; };
                window._interopDefault = function(e) { return e && e.__esModule ? e : { default: e }; };
                window._interopNamespace = function(e) {
                  if (e && e.__esModule) return e;
                  var n = Object.create(null);
                  if (e) {
                    Object.keys(e).forEach(function(k) {
                      n[k] = e[k];
                    });
                  }
                  n.default = e;
                  return n;
                };

                if (typeof define !== 'undefined' && define.amd) {
                  define('react', [], function() { return React; });
                  define('react-dom', [], function() { return ReactDOM; });
                  define('react/jsx-runtime', [], function() { return jsxRuntime; });
                }

                let WidgetModule = null;

                // CommonJS require shim for nested requires
                const moduleCache = {
                  'react': React,
                  'react-dom': ReactDOM,
                  'react/jsx-runtime': jsxRuntime,
                };
                window.require = function(dep) {
                  if (moduleCache[dep]) return moduleCache[dep];
                  console.warn('[Widget Preview] Unknown require:', dep);
                  return undefined;
                };

                const originalDefine = window.define;
                window.define = function(nameOrDeps, depsOrFactory, maybeFactory) {
                  // Handle different define signatures:
                  // define(deps, factory)
                  // define(name, deps, factory)
                  let deps, factory;
                  if (typeof nameOrDeps === 'string') {
                    deps = depsOrFactory || [];
                    factory = maybeFactory;
                  } else {
                    deps = nameOrDeps || [];
                    factory = depsOrFactory;
                  }

                  if (typeof factory === 'function') {
                    try {
                      const exportsObject = {};
                      const moduleObject = { exports: exportsObject };
                      const resolvedDeps = deps.map(dep => {
                        if (dep === 'react') return React;
                        if (dep === 'react-dom') return ReactDOM;
                        if (dep === 'react/jsx-runtime') return jsxRuntime;
                        if (dep === 'exports') return exportsObject;
                        if (dep === 'module') return moduleObject;
                        if (dep === 'require') return window.require;
                        return moduleCache[dep] || undefined;
                      });

                      const result = factory.apply(null, resolvedDeps);

                      if (result) {
                        WidgetModule = result;
                      } else if (moduleObject.exports !== exportsObject || Object.keys(exportsObject).length > 0) {
                        WidgetModule = moduleObject.exports;
                      } else if (Object.keys(exportsObject).length > 0) {
                        WidgetModule = exportsObject;
                      }
                    } catch (error) {
                      console.error('[Widget Preview] Error in AMD factory:', error);
                    }
                  }
                };
                window.define.amd = true;

                ${safeBundle}

                window.define = originalDefine;

                const container = document.getElementById('widget-root');
                if (!container) {
                  throw new Error('Root container not found');
                }

                const root = ReactDOM.createRoot(container);

                window.__widgetRoot = root;

                const createMockExpression = (value) => ({
                  value: value,
                  status: 'available'
                });

                const mxObjectSymbol = Symbol('mxObject');
                const mxObjectStore = new Map();
                const datasourceRegistry = new Map();

                // Store live datasource instances for state persistence
                const liveDatasources = new Map();

                const createMockDatasource = (jsonString, datasourceKey) => {
                  let items = [];
                  let attributeSchema = {};
                  // Use datasourceKey as mock entity name
                  const mockEntityName = 'Preview.' + datasourceKey;

                  // Get existing registry info if available
                  const existingRegistry = datasourceRegistry.get(datasourceKey);
                  if (existingRegistry && existingRegistry.attributeSchema) {
                    attributeSchema = existingRegistry.attributeSchema;
                  }

                  // Helper to create an item with mxObject symbol
                  const createItemWithMxObject = (item, guid) => {
                    // Check if mxObject already exists in store (reuse for state persistence)
                    const existingStored = mxObjectStore.get(guid);
                    let mxObject;

                    if (existingStored && existingStored.datasourceKey === datasourceKey) {
                      // Reuse existing mxObject and update its data
                      mxObject = existingStored.mxObject;
                      mxObject._data = { ...item };
                    } else {
                      // Create new mxObject
                      mxObject = {
                        _guid: guid,
                        _data: { ...item },
                        _entityName: mockEntityName,
                        get: function(attr) { return this._data[attr]; },
                        set: function(attr, value) { this._data[attr] = value; },
                        getEntity: function() { return this._entityName; }
                      };
                      mxObjectStore.set(guid, { mxObject, datasourceKey });
                    }

                    const itemWithSymbol = { ...item };
                    // Store guid as 'id' for internal tracking (used by widget to identify items)
                    itemWithSymbol.id = guid;
                    itemWithSymbol[mxObjectSymbol] = {
                      _mxObject: mxObject,
                      metaData: { attributes: attributeSchema }
                    };
                    return itemWithSymbol;
                  };

                  try {
                    const parsed = JSON.parse(jsonString);
                    let rawItems = Array.isArray(parsed) ? parsed : [parsed];

                    // Build attribute schema from the first item (merge with existing)
                    if (rawItems.length > 0) {
                      const newSchema = Object.keys(rawItems[0]).reduce((acc, k) => ({ ...acc, [k]: { type: 'String' } }), {});
                      attributeSchema = { ...attributeSchema, ...newSchema };
                    }

                    // Collect existing guids from mxObjectStore for this datasource (in order)
                    const existingGuids = [];
                    mxObjectStore.forEach((value, guid) => {
                      if (value.datasourceKey === datasourceKey) {
                        existingGuids.push(guid);
                      }
                    });

                    // If datasource is empty, check if we have items in mxObjectStore
                    // This preserves items created via mx.data.create
                    if (rawItems.length === 0 && existingGuids.length > 0) {
                      existingGuids.forEach(guid => {
                        const stored = mxObjectStore.get(guid);
                        if (stored) {
                          rawItems.push({ ...stored.mxObject._data });
                        }
                      });
                    }

                    // Track which guids are in the new data
                    const newGuids = new Set();

                    items = rawItems.map((item, index) => {
                      // Reuse existing guid if available (by index), otherwise generate new one
                      const guid = existingGuids[index] || ('item_' + Date.now() + '_' + index);
                      newGuids.add(guid);
                      return createItemWithMxObject(item, guid);
                    });

                    // Clean up mxObjectStore: remove objects that are no longer in datasource
                    // But preserve items that were dynamically created (new_ prefix)
                    const toRemove = [];
                    mxObjectStore.forEach((value, guid) => {
                      if (value.datasourceKey === datasourceKey && !newGuids.has(guid)) {
                        // Don't remove dynamically created items
                        if (!guid.startsWith('new_')) {
                          toRemove.push(guid);
                        }
                      }
                    });
                    toRemove.forEach(guid => mxObjectStore.delete(guid));

                    // Add any dynamically created items that weren't in rawItems
                    mxObjectStore.forEach((value, guid) => {
                      if (value.datasourceKey === datasourceKey && !newGuids.has(guid) && guid.startsWith('new_')) {
                        items.push(createItemWithMxObject(value.mxObject._data, guid));
                      }
                    });

                  } catch (e) {
                    // If parsing fails, check if we have existing items in mxObjectStore
                    const existingItems = [];
                    mxObjectStore.forEach((value, guid) => {
                      if (value.datasourceKey === datasourceKey) {
                        const item = { ...value.mxObject._data, id: guid };
                        item[mxObjectSymbol] = {
                          _mxObject: value.mxObject,
                          metaData: { attributes: attributeSchema }
                        };
                        existingItems.push(item);
                      }
                    });
                    items = existingItems;
                  }

                  // Register datasource for create operations
                  datasourceRegistry.set(datasourceKey, { attributeSchema, mockEntityName });

                  // Create or update the live datasource instance
                  let datasource = liveDatasources.get(datasourceKey);
                  if (!datasource) {
                    datasource = {
                      items: items,
                      status: 'available',
                      _attributeSchema: attributeSchema,
                      _mockEntityName: mockEntityName,
                      _datasourceKey: datasourceKey,
                      // Method to create a new item and add it to the datasource
                      create: function(callback) {
                        const guid = 'new_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        const newData = { id: guid };

                        // Initialize with empty values based on schema
                        Object.keys(this._attributeSchema).forEach(key => {
                          if (key !== 'id') newData[key] = '';
                        });

                        const mxObject = {
                          _guid: guid,
                          _data: newData,
                          _isNew: true,
                          _entityName: this._mockEntityName,
                          get: function(attr) { return this._data[attr]; },
                          set: function(attr, value) { this._data[attr] = value; },
                          getEntity: function() { return this._entityName; }
                        };

                        mxObjectStore.set(guid, { mxObject, datasourceKey: this._datasourceKey });

                        const itemWithSymbol = { ...newData };
                        itemWithSymbol[mxObjectSymbol] = {
                          _mxObject: mxObject,
                          metaData: { attributes: this._attributeSchema }
                        };

                        this.items.push(itemWithSymbol);

                        if (callback) callback(mxObject);
                        return mxObject;
                      }
                    };
                    liveDatasources.set(datasourceKey, datasource);
                  } else {
                    // Update existing datasource items
                    datasource.items = items;
                    datasource._attributeSchema = attributeSchema;
                  }

                  return datasource;
                };

                window.mx = {
                  data: {
                    get: function(options) {
                      const { guid, callback, error } = options;
                      const stored = mxObjectStore.get(guid);
                      if (stored) {
                        callback(stored.mxObject);
                      } else if (error) {
                        error(new Error('Object not found'));
                      }
                    },
                    create: function(options) {
                      const { entity, callback, error } = options;
                      try {
                        // Generate a unique guid for the new object
                        const guid = 'new_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

                        // Find the datasource key from entity name
                        let datasourceKey = null;
                        let attributeSchema = {};

                        datasourceRegistry.forEach((value, key) => {
                          if (value.mockEntityName === entity) {
                            datasourceKey = key;
                            attributeSchema = value.attributeSchema || {};
                          }
                        });

                        // Fallback: use the first registered datasource if entity not found
                        if (!datasourceKey && datasourceRegistry.size > 0) {
                          const firstEntry = datasourceRegistry.entries().next().value;
                          datasourceKey = firstEntry[0];
                          attributeSchema = firstEntry[1].attributeSchema || {};
                        }

                        // Create new data with empty values based on schema
                        const newData = {};
                        Object.keys(attributeSchema).forEach(key => {
                          newData[key] = '';
                        });

                        // Create a new mxObject
                        const mxObject = {
                          _guid: guid,
                          _data: newData,
                          _isNew: true,
                          _entityName: entity,
                          get: function(attr) { return this._data[attr]; },
                          set: function(attr, value) { this._data[attr] = value; },
                          getEntity: function() { return this._entityName; }
                        };

                        // Store the new object in mxObjectStore
                        if (datasourceKey) {
                          mxObjectStore.set(guid, { mxObject, datasourceKey });

                          // Also add to liveDatasources items for immediate UI update
                          const datasource = liveDatasources.get(datasourceKey);
                          if (datasource) {
                            const itemWithSymbol = { ...newData };
                            itemWithSymbol[mxObjectSymbol] = {
                              _mxObject: mxObject,
                              metaData: { attributes: attributeSchema }
                            };
                            datasource.items.push(itemWithSymbol);
                          }

                          // Notify parent about the new item for re-render
                          const allItems = [];
                          mxObjectStore.forEach((value) => {
                            if (value.datasourceKey === datasourceKey) {
                              allItems.push({ ...value.mxObject._data });
                            }
                          });
                          window.parent.postMessage({
                            type: 'DATASOURCE_COMMIT',
                            datasourceKey: datasourceKey,
                            items: allItems
                          }, '*');
                        }

                        if (callback) callback(mxObject);
                      } catch (e) {
                        if (error) error(e);
                      }
                    },
                    commit: function(options) {
                      const { mxobj, callback, error } = options;
                      try {
                        const guid = mxobj._guid;
                        const stored = mxObjectStore.get(guid);
                        if (stored) {
                          const { datasourceKey } = stored;

                          // Sync mxObject data to liveDatasources items
                          const datasource = liveDatasources.get(datasourceKey);
                          if (datasource) {
                            const item = datasource.items.find(i => i.id === guid);
                            if (item) {
                              // Update item properties from mxObject._data
                              Object.keys(mxobj._data).forEach(key => {
                                item[key] = mxobj._data[key];
                              });
                            }
                          }

                          const allItems = [];
                          mxObjectStore.forEach((value) => {
                            if (value.datasourceKey === datasourceKey) {
                              allItems.push({ ...value.mxObject._data });
                            }
                          });
                          window.parent.postMessage({
                            type: 'DATASOURCE_COMMIT',
                            datasourceKey: datasourceKey,
                            items: allItems
                          }, '*');
                        }
                        if (callback) callback();
                      } catch (e) {
                        if (error) error(e);
                      }
                    },
                    remove: function(options) {
                      const { guid, callback, error } = options;
                      try {
                        const stored = mxObjectStore.get(guid);
                        if (stored) {
                          const { datasourceKey } = stored;
                          mxObjectStore.delete(guid);

                          // Also remove from liveDatasources items for immediate UI update
                          const datasource = liveDatasources.get(datasourceKey);
                          if (datasource) {
                            const index = datasource.items.findIndex(item => item.id === guid);
                            if (index !== -1) {
                              datasource.items.splice(index, 1);
                            }
                          }

                          // Notify parent about the removal
                          const allItems = [];
                          mxObjectStore.forEach((value) => {
                            if (value.datasourceKey === datasourceKey) {
                              allItems.push({ ...value.mxObject._data });
                            }
                          });
                          window.parent.postMessage({
                            type: 'DATASOURCE_COMMIT',
                            datasourceKey: datasourceKey,
                            items: allItems
                          }, '*');
                        }
                        if (callback) callback();
                      } catch (e) {
                        if (error) error(e);
                      }
                    }
                  }
                };

                const createMockAttribute = (selectedKey) => {
                  return {
                    id: selectedKey,
                    get: (item) => {
                      const value = item ? item[selectedKey] : undefined;
                      return {
                        value: value,
                        displayValue: value !== undefined && value !== null ? String(value) : ''
                      };
                    },
                    status: 'available'
                  };
                };

                const createSimpleMockAttribute = (value) => ({
                  value: value,
                  status: 'available',
                  readOnly: false,
                  validation: undefined,
                  displayValue: value !== undefined && value !== null ? String(value) : '',
                  setValue: () => {}
                });

                const createMockTextTemplate = (value) => ({
                  value: value !== undefined && value !== null ? String(value) : ''
                });

                const getAllProperties = (definition) => {
                  const props = [];
                  if (definition && definition.properties) {
                    props.push(...definition.properties);
                  }
                  if (definition && definition.propertyGroups) {
                    const collectFromGroups = (groups) => {
                      groups.forEach(group => {
                        if (group.properties) {
                          props.push(...group.properties);
                        }
                        if (group.propertyGroups) {
                          collectFromGroups(group.propertyGroups);
                        }
                      });
                    };
                    collectFromGroups(definition.propertyGroups);
                  }
                  return props;
                };

                const getObjectPropertyDefs = (propertyDef) => {
                  const objectProps = [];
                  if (propertyDef && propertyDef.nestedPropertyGroups) {
                    propertyDef.nestedPropertyGroups.forEach(group => {
                      if (group.properties) {
                        objectProps.push(...group.properties);
                      }
                      if (group.propertyGroups) {
                        group.propertyGroups.forEach(nestedGroup => {
                          if (nestedGroup.properties) {
                            objectProps.push(...nestedGroup.properties);
                          }
                        });
                      }
                    });
                  }
                  return objectProps;
                };

                const mapObjectItem = (item, objectPropertyDefs, datasourceItems) => {
                  const mappedItem = {};
                  Object.keys(item).forEach(itemKey => {
                    const itemValue = item[itemKey];
                    const itemPropDef = objectPropertyDefs.find(p => p.key === itemKey);
                    const itemPropType = itemPropDef ? itemPropDef.type : null;

                    if (itemPropType === 'attribute') {
                      mappedItem[itemKey] = createMockAttribute(itemValue);
                    } else if (itemPropType === 'textTemplate') {
                      mappedItem[itemKey] = createMockTextTemplate(itemValue);
                    } else if (itemPropType === 'expression') {
                      mappedItem[itemKey] = createMockExpression(itemValue);
                    } else {
                      mappedItem[itemKey] = itemValue;
                    }
                  });
                  return mappedItem;
                };

                const mapPropsToWidgetFormat = (props, definition) => {
                  const widgetProps = {};
                  const allPropertyDefs = getAllProperties(definition);

                  Object.keys(props).forEach(key => {
                    const value = props[key];
                    const propertyDef = allPropertyDefs.find(p => p.key === key);
                    const propType = propertyDef ? propertyDef.type : null;

                    if (propType === 'datasource') {
                      widgetProps[key] = createMockDatasource(value, key);
                    } else if (propType === 'attribute') {
                      if (value) {
                        widgetProps[key] = createMockAttribute(value);
                      } else {
                        widgetProps[key] = createSimpleMockAttribute(value);
                      }
                    } else if (propType === 'expression' || key.includes('expression')) {
                      widgetProps[key] = createMockExpression(value);
                    } else if (propType === 'textTemplate') {
                      widgetProps[key] = createMockTextTemplate(value);
                    } else if (propType === 'object') {
                      const objectPropertyDefs = getObjectPropertyDefs(propertyDef);
                      const datasourceItems = widgetProps['datasource']?.items || [];
                      if (Array.isArray(value)) {
                        widgetProps[key] = value.map(item => mapObjectItem(item, objectPropertyDefs, datasourceItems));
                      } else if (value && typeof value === 'object') {
                        widgetProps[key] = mapObjectItem(value, objectPropertyDefs, datasourceItems);
                      } else {
                        widgetProps[key] = value;
                      }
                    } else {
                      widgetProps[key] = value;
                    }
                  });
                  return widgetProps;
                };

                window.__mapPropsToWidgetFormat = mapPropsToWidgetFormat;
                window.__widgetDefinition = ${safeWidgetDefinition};

                let Widget = null;

                if (WidgetModule) {
                  if (WidgetModule['${safeWidgetName}']) {
                    Widget = WidgetModule['${safeWidgetName}'];
                  } else if (WidgetModule.default) {
                    Widget = WidgetModule.default;
                  } else if (typeof WidgetModule === 'function') {
                    Widget = WidgetModule;
                  } else {
                    const exportedFunctions = Object.keys(WidgetModule).filter(k =>
                      typeof WidgetModule[k] === 'function' && k !== '__esModule'
                    );
                    if (exportedFunctions.length > 0) {
                      Widget = WidgetModule[exportedFunctions[0]];
                    }
                  }
                }

                if (!Widget && typeof window['${safeWidgetName}'] !== 'undefined') {
                  Widget = window['${safeWidgetName}'];
                } else if (!Widget && '${safeWidgetId}'.includes('.')) {
                  const lastPart = '${safeWidgetId}'.split('.').pop();
                  if (typeof window[lastPart] !== 'undefined') {
                    Widget = window[lastPart];
                  }
                }

                if (!Widget && '${safeWidgetId}'.includes('.')) {
                  const parts = '${safeWidgetId}'.split('.');
                  let obj = window;
                  for (let i = 0; i < parts.length; i++) {
                    obj = obj?.[parts[i]];
                    if (!obj) break;
                  }
                  if (obj) {
                    Widget = obj;
                  }
                }

                if (!Widget) {
                  throw new Error('Widget "${safeWidgetName}" (${safeWidgetId}) not found.');
                }

                window.__WidgetComponent = Widget;

                const initialProps = ${safeProperties};
                const initialDefinition = ${safeWidgetDefinition};
                const widgetProps = mapPropsToWidgetFormat(initialProps, initialDefinition);
                root.render(React.createElement(Widget, widgetProps));

                window.addEventListener('message', (event) => {
                  if (event.data && event.data.type === 'UPDATE_PROPERTIES') {
                    const newProps = event.data.properties;
                    const newDefinition = event.data.widgetDefinition || window.__widgetDefinition;
                    const mappedProps = window.__mapPropsToWidgetFormat(newProps, newDefinition);
                    const WidgetComp = window.__WidgetComponent;
                    const reactRoot = window.__widgetRoot;

                    if (WidgetComp && reactRoot) {
                      reactRoot.render(React.createElement(WidgetComp, mappedProps));
                    }
                  }
                });

                window.parent.postMessage({ type: 'IFRAME_READY' }, '*');

              } catch (error) {
                console.error('[Widget Preview] Error:', error);
                const container = document.getElementById('widget-root');
                if (container) {
                  container.innerHTML = \`
                    <div class="preview-error">
                      <strong>Preview Error</strong><br/>
                      \${error.message}<br/><br/>
                      <details>
                        <summary>Error Details</summary>
                        <pre>\${error.stack || 'No stack trace available'}</pre>
                      </details>
                    </div>
                  \`;
                }
              }
            })();
          </script>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
  }, [bundle, css, widgetName, widgetId]);

  useEffect(() => {
    const handleIframeMessage = (event) => {
      if (event.data && event.data.type === "IFRAME_READY") {
        iframeReadyRef.current = true;
        sendPropertiesToIframe(properties, widgetDefinition);
      }
      if (event.data && event.data.type === "DATASOURCE_COMMIT" && onDatasourceCommit) {
        const { datasourceKey, items } = event.data;
        onDatasourceCommit(datasourceKey, JSON.stringify(items, null, 2));
      }
    };

    window.addEventListener("message", handleIframeMessage);
    return () => window.removeEventListener("message", handleIframeMessage);
  }, [properties, widgetDefinition, sendPropertiesToIframe, onDatasourceCommit]);

  useEffect(() => {
    if (iframeReadyRef.current && properties) {
      sendPropertiesToIframe(properties, widgetDefinition);
    }
  }, [properties, widgetDefinition, sendPropertiesToIframe]);

  return (
    <iframe
      ref={iframeRef}
      title="Widget Preview"
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        borderRadius: "4px",
        backgroundColor: "white",
      }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
};

export default WidgetPreviewFrame;
