import { useEffect, useRef } from "react";

const WidgetPreviewFrame = ({ bundle, css, widgetName, widgetId, properties }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!iframeRef.current || !bundle) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // Safely escape values for injection into HTML
    const safeWidgetName = (widgetName || "Widget").replace(/'/g, "\\'");
    const safeWidgetId = (widgetId || "").replace(/'/g, "\\'");
    const safeProperties = JSON.stringify(properties || {});
    const safeBundle = bundle;
    const safeCss = css || "";

    // Create preview HTML with React runtime and widget bundle
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
          <!-- Widget CSS -->
          <style>
            ${safeCss}
          </style>
        </head>
        <body>
          <div id="widget-root">
            <div class="preview-loading">Loading widget...</div>
          </div>

          <!-- React Runtime from CDN -->
          <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>

          <!-- RequireJS for AMD module loading -->
          <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js"></script>

          <script>
            (function() {
              try {
                // Make React available globally
                window.React = React;
                window.ReactDOM = ReactDOM;

                // Create JSX runtime shim for React 18
                const jsxRuntime = {
                  jsx: React.createElement,
                  jsxs: React.createElement,
                  Fragment: React.Fragment,
                };

                // Configure RequireJS to handle React modules
                if (typeof define !== 'undefined' && define.amd) {
                  define('react', [], function() { return React; });
                  define('react-dom', [], function() { return ReactDOM; });
                  define('react/jsx-runtime', [], function() { return jsxRuntime; });
                }

                // Store the widget module
                let WidgetModule = null;

                // Override define to capture the widget module
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

                // Widget bundle
                ${safeBundle}

                // Restore original define
                window.define = originalDefine;

                // Get root element
                const container = document.getElementById('widget-root');
                if (!container) {
                  throw new Error('Root container not found');
                }

                // Create React root
                const root = ReactDOM.createRoot(container);

                // Mock Mendix context and APIs
                const createMockAttribute = (value) => ({
                  value: value,
                  status: 'available',
                  readOnly: false,
                  validation: undefined,
                  displayValue: value ? String(value) : '',
                  setValue: () => {}
                });

                const createMockExpression = (value) => ({
                  value: value,
                  status: 'available'
                });

                // Map properties to widget format
                const props = ${safeProperties};
                const widgetProps = {};

                Object.keys(props).forEach(key => {
                  const value = props[key];
                  if (key.includes('attribute') || key.includes('date') || key.includes('Date')) {
                    widgetProps[key] = createMockAttribute(value);
                  } else if (key.includes('expression') || key.includes('min') || key.includes('max')) {
                    widgetProps[key] = createMockExpression(value);
                  } else {
                    widgetProps[key] = value;
                  }
                });

                // Try to find and render the widget
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

                // Fallback to global exports
                if (!Widget && typeof window['${safeWidgetName}'] !== 'undefined') {
                  Widget = window['${safeWidgetName}'];
                } else if (!Widget && '${safeWidgetId}'.includes('.')) {
                  const lastPart = '${safeWidgetId}'.split('.').pop();
                  if (typeof window[lastPart] !== 'undefined') {
                    Widget = window[lastPart];
                  }
                }

                // Check for namespaced exports
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

                // Render the widget
                root.render(React.createElement(Widget, widgetProps));

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
  }, [bundle, css, widgetName, widgetId, properties]);

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
