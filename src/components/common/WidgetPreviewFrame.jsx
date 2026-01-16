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
            body {
              margin: 0;
              padding: 16px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              background: #f5f5f5;
            }
            .preview-container {
              background: white;
              border-radius: 8px;
              padding: 24px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              min-height: 200px;
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
          <div class="preview-container">
            <div id="widget-root">
              <div class="preview-loading">Loading widget...</div>
            </div>
          </div>

          <!-- React Runtime from CDN -->
          <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>

          <!-- RequireJS for AMD module loading -->
          <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js"></script>

          <script>
            (function() {
              try {
                console.log('[Widget Preview] Initializing preview...');
                console.log('[Widget Preview] Widget Name:', '${safeWidgetName}');
                console.log('[Widget Preview] Widget ID:', '${safeWidgetId}');
                console.log('[Widget Preview] Properties:', ${safeProperties});

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
                  console.log('[Widget Preview] AMD define called');
                  console.log('[Widget Preview] Dependencies:', deps);
                  console.log('[Widget Preview] Factory type:', typeof factory);

                  // If this is an AMD module definition
                  if (typeof factory === 'function') {
                    try {
                      // Create an exports object to capture named exports
                      const exportsObject = {};

                      // Resolve dependencies
                      const resolvedDeps = deps.map(dep => {
                        if (dep === 'react') return React;
                        if (dep === 'react-dom') return ReactDOM;
                        if (dep === 'react/jsx-runtime') return jsxRuntime;
                        if (dep === 'exports') return exportsObject;
                        return undefined;
                      });

                      // Call factory with resolved dependencies
                      const result = factory.apply(null, resolvedDeps);

                      // Store the result - prefer return value, fallback to exports object
                      if (result) {
                        WidgetModule = result;
                        console.log('[Widget Preview] Captured widget module from return value');
                      } else if (Object.keys(exportsObject).length > 0) {
                        WidgetModule = exportsObject;
                        console.log('[Widget Preview] Captured widget module from exports object');
                      } else {
                        console.warn('[Widget Preview] Factory returned no result and exports is empty');
                      }

                      if (WidgetModule) {
                        console.log('[Widget Preview] Module type:', typeof WidgetModule);
                        console.log('[Widget Preview] Module keys:', Object.keys(WidgetModule));
                        console.log('[Widget Preview] Module.default:', WidgetModule.default);
                        console.log('[Widget Preview] Full module:', WidgetModule);
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
                  setValue: (newValue) => {
                    console.log('[Mock Attribute] setValue called with:', newValue);
                  }
                });

                const createMockExpression = (value) => ({
                  value: value,
                  status: 'available'
                });

                // Map properties to widget format
                const props = ${safeProperties};
                const widgetProps = {};

                // Convert property values based on type
                Object.keys(props).forEach(key => {
                  const value = props[key];

                  // Check if it's an attribute-like property (DateTime, String, etc.)
                  if (key.includes('attribute') || key.includes('date') || key.includes('Date')) {
                    widgetProps[key] = createMockAttribute(value);
                  }
                  // Check if it's an expression-like property
                  else if (key.includes('expression') || key.includes('min') || key.includes('max')) {
                    widgetProps[key] = createMockExpression(value);
                  }
                  // Plain value
                  else {
                    widgetProps[key] = value;
                  }
                });

                console.log('[Widget Preview] Mapped props:', widgetProps);

                // Try to find and render the widget
                let Widget = null;

                // First check if we captured the module from AMD
                if (WidgetModule) {
                  console.log('[Widget Preview] Searching for widget component...');

                  // Try different export patterns:

                  // 1. Named export matching widget name (most common for Mendix widgets)
                  if (WidgetModule['${safeWidgetName}']) {
                    Widget = WidgetModule['${safeWidgetName}'];
                    console.log('[Widget Preview] Found widget as named export: ${safeWidgetName}');
                  }
                  // 2. Default export
                  else if (WidgetModule.default) {
                    Widget = WidgetModule.default;
                    console.log('[Widget Preview] Found widget as default export');
                  }
                  // 3. Module itself is a function
                  else if (typeof WidgetModule === 'function') {
                    Widget = WidgetModule;
                    console.log('[Widget Preview] Module itself is the widget function');
                  }
                  // 4. First function export (fallback)
                  else {
                    const exportedFunctions = Object.keys(WidgetModule).filter(k =>
                      typeof WidgetModule[k] === 'function' && k !== '__esModule'
                    );
                    if (exportedFunctions.length > 0) {
                      Widget = WidgetModule[exportedFunctions[0]];
                      console.log('[Widget Preview] Found widget as first function export:', exportedFunctions[0]);
                    }
                  }
                }

                // Fallback to global exports
                if (!Widget && typeof window['${safeWidgetName}'] !== 'undefined') {
                  Widget = window['${safeWidgetName}'];
                  console.log('[Widget Preview] Found widget at window.${safeWidgetName}');
                }
                else if (!Widget && '${safeWidgetId}'.includes('.')) {
                  const lastPart = '${safeWidgetId}'.split('.').pop();
                  if (typeof window[lastPart] !== 'undefined') {
                    Widget = window[lastPart];
                    console.log('[Widget Preview] Found widget at window.' + lastPart);
                  }
                }
                // Check for namespaced exports (e.g., com.mendix.widgets.WidgetName)
                if (!Widget && '${safeWidgetId}'.includes('.')) {
                  const parts = '${safeWidgetId}'.split('.');
                  let obj = window;
                  for (let i = 0; i < parts.length; i++) {
                    obj = obj?.[parts[i]];
                    if (!obj) break;
                  }
                  if (obj) {
                    Widget = obj;
                    console.log('[Widget Preview] Found widget at namespace:', '${safeWidgetId}');
                  }
                }

                if (!Widget) {
                  console.error('[Widget Preview] Widget not found.');
                  console.error('[Widget Preview] WidgetModule:', WidgetModule);
                  console.error('[Widget Preview] Available window properties:', Object.keys(window).filter(k => !k.startsWith('_')));
                  throw new Error('Widget "${safeWidgetName}" (${safeWidgetId}) not found. The widget may not have exported correctly.');
                }

                console.log('[Widget Preview] Found Widget:', Widget);
                console.log('[Widget Preview] Rendering widget with props:', widgetProps);

                // Render the widget
                root.render(React.createElement(Widget, widgetProps));

                console.log('[Widget Preview] Widget rendered successfully');

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
