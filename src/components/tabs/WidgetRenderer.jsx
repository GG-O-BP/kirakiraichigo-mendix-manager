import React, { memo, useRef, useEffect, useState, useCallback } from "react";
import * as R from "ramda";

const WidgetRenderer = memo(
  ({
    widgetContents,
    widgetPreviewData,
    properties = {},
    selectedWidget,
    onError,
  }) => {
    const iframeRef = useRef(null);
    const [isRendering, setIsRendering] = useState(false);
    const [renderError, setRenderError] = useState(null);

    // Create base HTML template for widget rendering
    const createBaseHTML = useCallback(() => {
      return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Widget Preview</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            margin: 0;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: #f8f9fa;
            min-height: 100vh;
        }
        .widget-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            padding: 20px;
            margin: 0 auto;
            max-width: 100%;
        }
        .widget-error {
            color: #dc3545;
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 4px;
            padding: 12px;
            margin: 8px 0;
        }
        .widget-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: #6c757d;
        }
        .loading-spinner {
            animation: spin 1s linear infinite;
            margin-right: 8px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        /* Mendix widget base styles */
        .mx-widget {
            position: relative;
        }
        .form-group {
            margin-bottom: 15px;
        }
        .form-control {
            display: block;
            width: 100%;
            padding: 6px 12px;
            font-size: 14px;
            line-height: 1.42857143;
            color: #555;
            background-color: #fff;
            background-image: none;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        .btn {
            display: inline-block;
            padding: 6px 12px;
            margin-bottom: 0;
            font-size: 14px;
            font-weight: normal;
            line-height: 1.42857143;
            text-align: center;
            white-space: nowrap;
            vertical-align: middle;
            cursor: pointer;
            border: 1px solid transparent;
            border-radius: 4px;
            text-decoration: none;
        }
        .btn-primary {
            color: #fff;
            background-color: #007bff;
            border-color: #007bff;
        }
        .btn-primary:hover {
            background-color: #0056b3;
            border-color: #004085;
        }
    </style>
</head>
<body>
    <div class="widget-container">
        <div id="widget-mount-point">
            <div class="widget-loading">
                <div class="loading-spinner">⏳</div>
                <span>Loading widget...</span>
            </div>
        </div>
    </div>

    <script>
        // Global error handler
        window.addEventListener('error', function(event) {
            console.error('Widget Error:', event.error);
            const mountPoint = document.getElementById('widget-mount-point');
            if (mountPoint) {
                mountPoint.innerHTML = \`
                    <div class="widget-error">
                        <strong>Widget Error:</strong><br>
                        \${event.error?.message || 'Unknown error occurred'}
                    </div>
                \`;
            }
        });

        // Module system polyfills
        window.exports = window.exports || {};
        window.module = window.module || { exports: {} };

        // CommonJS require polyfill
        window.require = function(moduleName) {
            console.log('Mock require called for:', moduleName);
            // Return mock objects for common dependencies
            if (moduleName === 'react') {
                return window.React || {};
            }
            if (moduleName === 'react-dom') {
                return window.ReactDOM || {};
            }
            if (moduleName.includes('mendix')) {
                return window.mx || {};
            }
            return {};
        };

        // AMD define polyfill
        window.define = function(deps, factory) {
            console.log('Mock define called with deps:', deps);
            if (typeof deps === 'function') {
                // define(factory)
                try {
                    deps();
                } catch (e) {
                    console.warn('Define factory execution failed:', e);
                }
            } else if (Array.isArray(deps) && typeof factory === 'function') {
                // define([deps], factory)
                try {
                    var mockDeps = deps.map(function(dep) {
                        if (dep === 'require') return window.require;
                        if (dep === 'exports') return window.exports;
                        if (dep === 'module') return window.module;
                        return {};
                    });
                    factory.apply(null, mockDeps);
                } catch (e) {
                    console.warn('Define factory execution failed:', e);
                }
            }
        };
        window.define.amd = true;

        // Mock React and ReactDOM for widget rendering
        if (!window.React) {
            window.React = {
                createElement: function(type, props, ...children) {
                    console.log('Mock React.createElement called:', type, props, children);

                    // Flatten children and filter out null/undefined
                    const flatChildren = children.flat().filter(child => child != null);
                    const finalProps = props || {};

                    if (flatChildren.length > 0) {
                        finalProps.children = flatChildren.length === 1 ? flatChildren[0] : flatChildren;
                    }

                    if (typeof type === 'function') {
                        try {
                            // Call the component function with props (including children)
                            const result = type(finalProps);
                            return result;
                        } catch (e) {
                            console.error('Component render failed:', e);
                            return {
                                type: 'div',
                                props: {
                                    className: 'widget-error',
                                    children: 'Component render failed: ' + e.message
                                }
                            };
                        }
                    }

                    return {
                        type,
                        props: finalProps,
                        children: finalProps.children
                    };
                }
            };
        }

        if (!window.ReactDOM) {
            window.ReactDOM = {
                render: function(element, container) {
                    console.log('Mock ReactDOM.render called:', element, container);

                    function elementToHTML(el) {
                        if (typeof el === 'string' || typeof el === 'number') {
                            return String(el);
                        }

                        if (!el || typeof el !== 'object') {
                            return '';
                        }

                        if (Array.isArray(el)) {
                            return el.map(elementToHTML).join('');
                        }

                        if (el.type && typeof el.type === 'string') {
                            const tagName = el.type;
                            const props = el.props || {};
                            const children = el.children || props.children || [];

                            // Handle attributes
                            const attrs = Object.entries(props)
                                .filter(([key]) => key !== 'children')
                                .map(([key, value]) => {
                                    if (key === 'className') return 'class="' + value + '"';
                                    if (typeof value === 'boolean') return value ? key : '';
                                    return key + '="' + value + '"';
                                })
                                .filter(Boolean)
                                .join(' ');

                            // Handle children
                            const childrenHTML = Array.isArray(children)
                                ? children.map(elementToHTML).join('')
                                : elementToHTML(children);

                            // Self-closing tags
                            const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'];
                            if (selfClosing.includes(tagName)) {
                                return '<' + tagName + (attrs ? ' ' + attrs : '') + ' />';
                            }

                            return '<' + tagName + (attrs ? ' ' + attrs : '') + '>' + childrenHTML + '</' + tagName + '>';
                        }

                        return '';
                    }

                    try {
                        if (container && element) {
                            const html = elementToHTML(element);
                            container.innerHTML = html || '<div class="widget-hello-world">Widget rendered</div>';
                        }
                    } catch (error) {
                        console.error('ReactDOM.render failed:', error);
                        if (container) {
                            container.innerHTML = '<div class="widget-error">Render failed: ' + error.message + '</div>';
                        }
                    }
                }
            };
        }

        // Mock Mendix API for widgets that expect it
        window.mx = {
            data: {
                create: function() { return Promise.resolve({}); },
                get: function() { return Promise.resolve({}); },
                save: function() { return Promise.resolve(); },
                remove: function() { return Promise.resolve(); }
            },
            ui: {
                info: function(msg) { console.log('Info:', msg); },
                error: function(msg) { console.error('Error:', msg); },
                confirmation: function(options) {
                    return Promise.resolve(confirm(options.content));
                }
            },
            parser: {
                parseValue: function(value) { return value; }
            }
        };

        // Widget properties from parent
        window.widgetProperties = {};

        // Function to update widget properties
        window.updateWidgetProperties = function(newProps) {
            window.widgetProperties = { ...window.widgetProperties, ...newProps };
            // Trigger widget update if it has an update method
            if (window.widgetInstance && typeof window.widgetInstance.update === 'function') {
                window.widgetInstance.update();
            }
        };

        // Mock DOM node for widget mounting
        function createWidgetNode() {
            const node = document.createElement('div');
            node.className = 'mx-widget widget-instance';
            return node;
        }

        // Widget initialization state tracking
        window.widgetInitState = {
            initialized: false,
            initializing: false,
            attempts: 0,
            maxAttempts: 3,
            lastError: null
        };

        // Initialize widget rendering with better error handling and detection
        window.initializeWidget = function() {
            // Prevent multiple simultaneous initialization attempts
            if (window.widgetInitState.initializing) {
                console.warn('Widget initialization already in progress, skipping');
                return false;
            }

            // Prevent too many attempts
            if (window.widgetInitState.attempts >= window.widgetInitState.maxAttempts) {
                console.error('Maximum initialization attempts reached');
                return false;
            }

            // If already initialized successfully, don't reinitialize
            if (window.widgetInitState.initialized) {
                console.log('Widget already initialized, skipping');
                return true;
            }

            const mountPoint = document.getElementById('widget-mount-point');
            if (!mountPoint) {
                console.error('Mount point not found');
                return false;
            }

            // Set initialization state
            window.widgetInitState.initializing = true;
            window.widgetInitState.attempts++;

            // Set timeout to prevent hanging
            const timeoutId = setTimeout(() => {
                if (window.widgetInitState.initializing) {
                    console.warn('Widget initialization timeout, resetting state');
                    window.widgetInitState.initializing = false;
                    window.widgetInitState.lastError = 'Initialization timeout';
                }
            }, 10000);

            try {
                mountPoint.innerHTML = '';
                const widgetNode = createWidgetNode();
                mountPoint.appendChild(widgetNode);

                // Try multiple ways to find and initialize the widget
                let initialized = false;

                // Method 1: Get widget property configuration first
                let widgetConfig = null;
                if (typeof window.getProperties === 'function') {
                    try {
                        console.log('Getting widget properties configuration...');
                        widgetConfig = window.getProperties(window.widgetProperties, {}, 'web');
                        console.log('Widget config obtained:', widgetConfig);
                    } catch (error) {
                        console.warn('Failed to get widget properties:', error);
                    }
                }

                // Method 2: Look for actual widget components
                const widgetComponentNames = [
                    'Helloworld',
                    'HelloWorldSample',
                    'Widget',
                    'WidgetComponent',
                    'MainComponent'
                ];

                // Try to find and render the main widget component
                for (const componentName of widgetComponentNames) {
                    let Component = window[componentName];

                    // Also check in exports
                    if (!Component && window.widgetExports && window.widgetExports[componentName]) {
                        Component = window.widgetExports[componentName];
                    }

                    if (typeof Component === 'function') {
                        try {
                            console.log('Rendering widget component ' + componentName + ' with properties:', window.widgetProperties);

                            // Create React element with properties
                            if (window.React && window.React.createElement) {
                                const element = window.React.createElement(Component, window.widgetProperties);

                                if (window.ReactDOM && window.ReactDOM.render) {
                                    window.ReactDOM.render(element, widgetNode);
                                } else {
                                    // Fallback: try to render directly
                                    const result = Component(window.widgetProperties);
                                    if (result && typeof result === 'object' && result.type) {
                                        widgetNode.innerHTML = \`<div class="widget-container">Component rendered successfully</div>\`;
                                    } else {
                                        widgetNode.innerHTML = result || '<div>Component rendered</div>';
                                    }
                                }
                            } else {
                                // Direct function call fallback
                                const result = Component(window.widgetProperties);
                                if (typeof result === 'string') {
                                    widgetNode.innerHTML = result;
                                } else {
                                    widgetNode.innerHTML = '<div class="widget-container">Widget component executed</div>';
                                }
                            }

                            window.widgetInstance = Component;
                            initialized = true;
                            console.log('Successfully rendered widget component ' + componentName);
                            break;
                        } catch (error) {
                            console.warn('Failed to render widget component ' + componentName + ':', error);
                            window.widgetInitState.lastError = error.message;
                        }
                    }
                }

                // Method 3: Try traditional initialization functions as fallback
                if (!initialized) {
                    const initFunctions = ['initWidget', 'renderWidget', 'createWidget'];

                    for (const funcName of initFunctions) {
                        if (typeof window[funcName] === 'function') {
                            try {
                                console.log('Trying initialization with ' + funcName);
                                window.widgetInstance = window[funcName](widgetNode, window.widgetProperties);
                                initialized = true;
                                console.log('Successfully initialized with ' + funcName);
                                break;
                            } catch (error) {
                                console.warn('Failed to initialize with ' + funcName + ':', error);
                                window.widgetInitState.lastError = error.message;
                            }
                        }
                    }
                }

                // Method 4: Try other exported functions as last resort (excluding config functions)
                if (!initialized && window.widgetExports) {
                    const configFunctions = ['getProperties', 'getPreviewCss', 'preview'];
                    for (const [key, value] of Object.entries(window.widgetExports)) {
                        if (typeof value === 'function' && !configFunctions.includes(key)) {
                            try {
                                console.log('Trying initialization with exported function ' + key);
                                window.widgetInstance = value(widgetNode, window.widgetProperties);
                                initialized = true;
                                console.log('Successfully initialized with exported ' + key);
                                break;
                            } catch (error) {
                                console.warn('Failed to initialize with exported ' + key + ':', error);
                                window.widgetInitState.lastError = error.message;
                            }
                        }
                    }
                }

                // Method 5: Look for AMD/CommonJS modules
                if (!initialized && (window.module.exports || window.exports)) {
                    const moduleExports = window.module.exports || window.exports;
                    if (typeof moduleExports === 'function') {
                        try {
                            console.log('Trying initialization with module.exports');
                            window.widgetInstance = moduleExports(widgetNode, window.widgetProperties);
                            initialized = true;
                            console.log('Successfully initialized with module.exports');
                        } catch (error) {
                            console.warn('Failed to initialize with module.exports:', error);
                            window.widgetInitState.lastError = error.message;
                        }
                    }
                }

                // Update state based on result
                window.widgetInitState.initialized = initialized;
                window.widgetInitState.initializing = false;
                clearTimeout(timeoutId);

                // Fallback: show success message with debugging info
                if (!initialized) {
                    console.log('No widget initialization function found, showing fallback');
                    const availableFunctions = Object.keys(window).filter(key =>
                        typeof window[key] === 'function' && !key.startsWith('webkit') && !key.startsWith('chrome')
                    );
                    widgetNode.innerHTML =
                        '<div style="padding: 20px; text-align: center; border: 2px dashed #ddd; border-radius: 8px;">' +
                            '<h4>🎭 Widget Preview</h4>' +
                            '<p>Widget files loaded (attempt ' + window.widgetInitState.attempts + '/' + window.widgetInitState.maxAttempts + ')</p>' +
                            '<div style="margin-top: 16px; font-size: 12px; color: #666;">' +
                                'Properties: ' + Object.keys(window.widgetProperties).length + ' configured<br>' +
                                'Available functions: ' + availableFunctions.length + '<br>' +
                                (window.widgetInitState.lastError ? 'Last error: ' + window.widgetInitState.lastError + '<br>' : '') +
                                '<details style="margin-top: 8px;">' +
                                    '<summary>Debug Info</summary>' +
                                    '<div style="text-align: left; font-size: 10px; margin-top: 8px;">' +
                                        'Functions: ' + availableFunctions.slice(0, 15).join(', ') + (availableFunctions.length > 15 ? '...' : '') + '<br>' +
                                        'Widget Exports: ' + (window.widgetExports ? Object.keys(window.widgetExports).join(', ') : 'None') + '<br>' +
                                        'Module Exports: ' + typeof (window.module.exports || window.exports) +
                                    '</div>' +
                                '</details>' +
                            '</div>' +
                        '</div>';
                }

                return initialized;
            } catch (error) {
                console.error('Widget initialization error:', error);
                window.widgetInitState.initializing = false;
                window.widgetInitState.lastError = error.message;
                clearTimeout(timeoutId);

                mountPoint.innerHTML =
                    '<div class="widget-error">' +
                        '<strong>Initialization Error (attempt ' + window.widgetInitState.attempts + '):</strong><br>' +
                        error.message + '<br>' +
                        '<small>' + error.stack + '</small>' +
                        (window.widgetInitState.attempts < window.widgetInitState.maxAttempts ?
                            '<br><button onclick="window.initializeWidget()" style="margin-top: 8px; padding: 4px 8px;">Retry</button>' :
                            '<br><small>Maximum attempts reached</small>'
                        ) +
                    '</div>';
                return false;
            }
        };

        // Function to reset widget state for retry
        window.resetWidgetState = function() {
            window.widgetInitState = {
                initialized: false,
                initializing: false,
                attempts: 0,
                maxAttempts: 3,
                lastError: null
            };
            console.log('Widget state reset');
        };
    </script>
</body>
</html>`;
    }, []);

    // Inject CSS files into iframe
    const injectCSS = useCallback((iframeDoc, cssContent) => {
      if (!cssContent) return;

      const style = iframeDoc.createElement("style");
      style.textContent = cssContent;
      iframeDoc.head.appendChild(style);
    }, []);

    // Inject JavaScript files into iframe
    const injectJS = useCallback((iframeDoc, jsContent) => {
      if (!jsContent) return;

      try {
        // Handle ES6 import/export statements
        let processedContent = jsContent;

        // Check if content uses ES6 modules
        const hasES6Imports = /import\s+.*?\s+from\s+['"][^'"]+['"];?/g.test(
          processedContent,
        );
        const hasES6Exports = /export\s+(default\s+|{[^}]+})/g.test(
          processedContent,
        );

        if (hasES6Imports || hasES6Exports) {
          // Convert ES6 imports to require statements (more robust)
          processedContent = processedContent.replace(
            /import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g,
            'var $1 = require("$2");',
          );
          processedContent = processedContent.replace(
            /import\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"];?/g,
            function (match, imports, module) {
              const importList = imports.split(",").map((imp) => imp.trim());
              return `var ${module}_module = require("${module}"); ${importList.map((imp) => `var ${imp} = ${module}_module.${imp};`).join(" ")}`;
            },
          );

          // Convert ES6 exports (more robust)
          processedContent = processedContent.replace(
            /export\s+default\s+(.+);?/g,
            "module.exports = $1;",
          );
          processedContent = processedContent.replace(
            /export\s+\{([^}]+)\}/g,
            function (match, exports) {
              return exports
                .split(",")
                .map((exp) => {
                  const trimmed = exp.trim();
                  return `module.exports.${trimmed} = ${trimmed};`;
                })
                .join("\n");
            },
          );
        }

        // Wrap in IIFE to prevent global pollution and add better error handling
        const script = iframeDoc.createElement("script");
        script.textContent = `
          (function() {
            try {
              // Reset module.exports for this script
              var module = window.module || { exports: {} };
              var exports = module.exports;

              ${processedContent}

              // Store any exports
              if (module.exports && Object.keys(module.exports).length > 0) {
                window.widgetExports = window.widgetExports || {};
                Object.assign(window.widgetExports, module.exports);
              }
            } catch (error) {
              console.warn('Script execution failed:', error.message, error.stack);
              window.dispatchEvent(new CustomEvent('scripterror', { detail: error }));
            }
          })();
        `;

        // Add error handler for script loading
        script.onerror = function (error) {
          console.error("Script loading failed:", error);
        };

        iframeDoc.body.appendChild(script);
      } catch (error) {
        console.error("Failed to inject script:", error);
        throw error;
      }
    }, []);

    // Render widget in iframe
    const renderWidget = useCallback(async () => {
      if (!iframeRef.current || !widgetContents) return;

      setIsRendering(true);
      setRenderError(null);

      try {
        const iframe = iframeRef.current;
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow.document;

        // Write base HTML
        iframeDoc.open();
        iframeDoc.write(createBaseHTML());
        iframeDoc.close();

        // Wait for iframe to be ready
        await new Promise((resolve) => {
          iframe.onload = resolve;
          if (iframe.contentDocument.readyState === "complete") {
            resolve();
          }
        });

        // Inject widget properties
        iframe.contentWindow.widgetProperties = properties || {};

        // Inject CSS files first
        const cssFiles = R.filter(
          (file) =>
            file.extension === "css" ||
            file.extension === "scss" ||
            file.extension === "sass" ||
            file.extension === "less",
          widgetContents.web_files || [],
        );

        for (const cssFile of cssFiles) {
          if (cssFile.content) {
            injectCSS(iframe.contentDocument, cssFile.content);
          }
        }

        // Inject main CSS if available
        if (widgetPreviewData?.main_css_file) {
          const mainCssFile = R.find(
            R.propEq(widgetPreviewData.main_css_file, "path"),
            widgetContents.web_files || [],
          );
          if (mainCssFile?.content) {
            injectCSS(iframe.contentDocument, mainCssFile.content);
          }
        }

        // Sort JavaScript files by dependency order (basic heuristic)
        const jsFiles = R.filter(
          (file) =>
            file.extension === "js" ||
            file.extension === "jsx" ||
            file.extension === "ts" ||
            file.extension === "tsx" ||
            file.extension === "mjs",
          widgetContents.web_files || [],
        );

        // Sort files: libraries first, then modules, then main files
        const sortedJsFiles = R.sort((a, b) => {
          const aIsLib =
            a.path.toLowerCase().includes("lib") ||
            a.path.toLowerCase().includes("vendor");
          const bIsLib =
            b.path.toLowerCase().includes("lib") ||
            b.path.toLowerCase().includes("vendor");
          const aIsMain =
            a.path.toLowerCase().includes("main") ||
            a.path.toLowerCase().includes("index");
          const bIsMain =
            b.path.toLowerCase().includes("main") ||
            b.path.toLowerCase().includes("index");

          if (aIsLib && !bIsLib) return -1;
          if (!aIsLib && bIsLib) return 1;
          if (aIsMain && !bIsMain) return 1;
          if (!aIsMain && bIsMain) return -1;
          return 0;
        }, jsFiles);

        // Inject JavaScript files in order with error handling
        let scriptsLoaded = 0;
        const totalScripts =
          sortedJsFiles.length + (widgetPreviewData?.main_js_file ? 1 : 0);

        const handleScriptLoad = () => {
          scriptsLoaded++;
          console.log(`Script loaded: ${scriptsLoaded}/${totalScripts}`);

          if (scriptsLoaded >= totalScripts) {
            // All scripts loaded, initialize widget with proper timing
            setTimeout(() => {
              try {
                console.log(
                  "All scripts loaded, attempting widget initialization...",
                );
                if (
                  iframe.contentWindow &&
                  iframe.contentWindow.initializeWidget &&
                  !iframe.contentWindow.widgetInitState?.initializing
                ) {
                  const success = iframe.contentWindow.initializeWidget();
                  if (!success) {
                    console.warn("Widget initialization returned false");
                    setRenderError(
                      "Widget initialization failed - see console for details",
                    );
                  }
                } else if (!iframe.contentWindow?.initializeWidget) {
                  console.warn("initializeWidget function not found in iframe");
                  setRenderError("Widget initialization function not found");
                } else if (iframe.contentWindow.widgetInitState?.initializing) {
                  console.log("Widget initialization already in progress");
                }
              } catch (error) {
                console.error("Widget initialization failed:", error);
                setRenderError(`Initialization failed: ${error.message}`);
              }
            }, 300);
          }
        };

        for (const jsFile of sortedJsFiles) {
          if (jsFile.content) {
            try {
              injectJS(iframe.contentDocument, jsFile.content);
              handleScriptLoad();
            } catch (error) {
              console.warn(`Failed to inject script ${jsFile.path}:`, error);
              handleScriptLoad(); // Continue even if one script fails
            }
          } else {
            handleScriptLoad();
          }
        }

        // Inject main JS if available
        if (widgetPreviewData?.main_js_file) {
          const mainJsFile = R.find(
            R.propEq(widgetPreviewData.main_js_file, "path"),
            widgetContents.web_files || [],
          );
          if (mainJsFile?.content) {
            try {
              injectJS(iframe.contentDocument, mainJsFile.content);
              handleScriptLoad();
            } catch (error) {
              console.warn("Failed to inject main script:", error);
              handleScriptLoad();
            }
          } else {
            handleScriptLoad();
          }
        }

        // Fallback initialization if no scripts
        if (totalScripts === 0) {
          setTimeout(() => {
            try {
              if (
                iframe.contentWindow &&
                iframe.contentWindow.initializeWidget &&
                !iframe.contentWindow.widgetInitState?.initializing
              ) {
                console.log(
                  "No scripts found, attempting fallback initialization...",
                );
                const success = iframe.contentWindow.initializeWidget();
                if (!success) {
                  setRenderError(
                    "No widget scripts found and fallback initialization failed",
                  );
                }
              } else if (!iframe.contentWindow?.initializeWidget) {
                console.warn(
                  "No scripts loaded and no initialization function available",
                );
                setRenderError("No widget scripts found to initialize");
              }
            } catch (error) {
              console.error("Fallback initialization failed:", error);
              setRenderError(
                `Fallback initialization failed: ${error.message}`,
              );
            }
          }, 500);
        }
      } catch (error) {
        console.error("Failed to render widget:", error);
        setRenderError(error.message);
        if (onError) {
          onError(error);
        }
      } finally {
        setIsRendering(false);
      }
    }, [
      widgetContents,
      widgetPreviewData,
      properties,
      createBaseHTML,
      injectCSS,
      injectJS,
      onError,
    ]);

    // Update properties in iframe when they change
    const updateProperties = useCallback(() => {
      if (!iframeRef.current) return;

      try {
        const iframe = iframeRef.current;
        if (
          iframe.contentWindow &&
          iframe.contentWindow.updateWidgetProperties
        ) {
          iframe.contentWindow.updateWidgetProperties(properties);
        }
      } catch (error) {
        console.error("Failed to update widget properties:", error);
      }
    }, [properties]);

    // Render widget when contents change
    useEffect(() => {
      if (widgetContents && widgetPreviewData) {
        renderWidget();
      }
    }, [widgetContents, widgetPreviewData, renderWidget]);

    // Update properties when they change
    useEffect(() => {
      updateProperties();
    }, [properties, updateProperties]);

    // Handle iframe errors
    const handleIframeError = useCallback(
      (error) => {
        console.error("Iframe error:", error);
        setRenderError("Failed to load widget preview");
        if (onError) {
          onError(error);
        }
      },
      [onError],
    );

    if (!widgetContents || !widgetPreviewData) {
      return (
        <div className="widget-renderer-empty">
          <div className="empty-state">
            <span className="berry-icon">🍓</span>
            <p>No widget selected for rendering</p>
          </div>
        </div>
      );
    }

    return (
      <div className="widget-renderer">
        <div className="renderer-content">
          {renderError && (
            <div className="render-error">
              <div className="error-icon">❌</div>
              <div className="error-details">
                <h5>Rendering Error</h5>
                <p>{renderError}</p>
                <button
                  className="retry-button"
                  onClick={() => {
                    setRenderError(null);
                    renderWidget();
                  }}
                >
                  🔄 Retry
                </button>
              </div>
            </div>
          )}

          <div className="iframe-container">
            <iframe
              ref={iframeRef}
              className="widget-iframe"
              sandbox="allow-scripts allow-same-origin allow-forms"
              onError={handleIframeError}
              title={`Widget Preview: ${widgetPreviewData?.component_name || "Unknown"}`}
            />
          </div>
        </div>
      </div>
    );
  },
);

WidgetRenderer.displayName = "WidgetRenderer";

export default WidgetRenderer;
