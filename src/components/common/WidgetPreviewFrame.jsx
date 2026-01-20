import { useEffect, useRef, useCallback } from "react";

const WidgetPreviewFrame = ({ bundle, css, widgetName, widgetId, properties, widgetDefinition }) => {
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

                const jsxRuntime = {
                  jsx: React.createElement,
                  jsxs: React.createElement,
                  Fragment: React.Fragment,
                };

                if (typeof define !== 'undefined' && define.amd) {
                  define('react', [], function() { return React; });
                  define('react-dom', [], function() { return ReactDOM; });
                  define('react/jsx-runtime', [], function() { return jsxRuntime; });
                }

                let WidgetModule = null;

                const originalDefine = window.define;
                window.define = function(deps, factory) {
                  if (typeof factory === 'function') {
                    try {
                      const exportsObject = {};
                      const resolvedDeps = deps.map(dep => {
                        if (dep === 'react') return React;
                        if (dep === 'react-dom') return ReactDOM;
                        if (dep === 'react/jsx-runtime') return jsxRuntime;
                        if (dep === 'exports') return exportsObject;
                        return undefined;
                      });

                      const result = factory.apply(null, resolvedDeps);

                      if (result) {
                        WidgetModule = result;
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

                const createMockDatasource = (jsonString) => {
                  let items = [];
                  try {
                    const parsed = JSON.parse(jsonString);
                    items = Array.isArray(parsed) ? parsed : [parsed];
                  } catch (e) {
                    items = [];
                  }
                  return {
                    items: items,
                    status: 'available'
                  };
                };

                const createMockAttribute = (selectedKey) => {
                  return {
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

                const mapPropsToWidgetFormat = (props, definition) => {
                  const widgetProps = {};
                  const allPropertyDefs = getAllProperties(definition);

                  Object.keys(props).forEach(key => {
                    const value = props[key];
                    const propertyDef = allPropertyDefs.find(p => p.key === key);
                    const propType = propertyDef ? propertyDef.type : null;

                    if (propType === 'datasource') {
                      widgetProps[key] = createMockDatasource(value);
                    } else if (propType === 'attribute') {
                      if (value) {
                        widgetProps[key] = createMockAttribute(value);
                      } else {
                        widgetProps[key] = createSimpleMockAttribute(value);
                      }
                    } else if (propType === 'expression' || key.includes('expression')) {
                      widgetProps[key] = createMockExpression(value);
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
    const handleIframeReady = (event) => {
      if (event.data && event.data.type === "IFRAME_READY") {
        iframeReadyRef.current = true;
        sendPropertiesToIframe(properties, widgetDefinition);
      }
    };

    window.addEventListener("message", handleIframeReady);
    return () => window.removeEventListener("message", handleIframeReady);
  }, [properties, widgetDefinition, sendPropertiesToIframe]);

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
