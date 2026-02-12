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
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">
          <style>
            /* ========================================
               Mendix Atlas UI Base Styles
               ======================================== */

            /* CSS Variables - Mendix Atlas UI */
            :root {
              /* Brand Colors */
              --brand-default: #DDDDDD;
              --brand-primary: #0595DB;
              --brand-inverse: #252C36;
              --brand-info: #48B0F7;
              --brand-success: #76CA02;
              --brand-warning: #f99b1d;
              --brand-danger: #ed1c24;

              /* Gray Shades */
              --gray-darker: #222;
              --gray-dark: #333;
              --gray: #555;
              --gray-light: #888;
              --gray-primary: #d7d7d7;
              --gray-lighter: #eee;

              /* Typography */
              --font-family-base: 'Open Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              --font-size-default: 14px;
              --font-color-default: #555;
              --line-height-base: 1.428571429;

              /* Spacing */
              --spacing-small: 5px;
              --spacing-medium: 15px;
              --spacing-large: 30px;
              --gutter-size: 15px;

              /* Form */
              --form-input-height: 34px;
              --form-input-padding-x: 8px;
              --form-input-padding-y: 6px;
              --form-input-border-color: #CCC;
              --form-input-border-radius: 4px;
              --form-input-bg: #FFF;

              /* Background */
              --bg-color: #FFF;
              --bg-color-secondary: #F5F8FD;
            }

            /* Normalize / Reset */
            *, *::before, *::after {
              box-sizing: border-box;
            }

            html {
              font-size: var(--font-size-default);
              line-height: var(--line-height-base);
              -webkit-text-size-adjust: 100%;
              -webkit-tap-highlight-color: rgba(0,0,0,0);
            }

            body {
              margin: 0;
              font-family: var(--font-family-base);
              font-size: var(--font-size-default);
              font-weight: 400;
              line-height: var(--line-height-base);
              color: var(--font-color-default);
              background-color: var(--bg-color);
            }

            html, body, #widget-root {
              width: 100%;
              height: 100%;
            }

            /* Typography */
            h1, h2, h3, h4, h5, h6 {
              margin-top: 0;
              margin-bottom: 10px;
              font-weight: 500;
              line-height: 1.2;
              color: var(--gray-darker);
            }
            h1 { font-size: 31px; }
            h2 { font-size: 26px; }
            h3 { font-size: 24px; }
            h4 { font-size: 18px; }
            h5 { font-size: 14px; }
            h6 { font-size: 12px; }

            p {
              margin-top: 0;
              margin-bottom: 10px;
            }

            a {
              color: var(--brand-primary);
              text-decoration: none;
            }
            a:hover, a:focus {
              color: #0477ab;
              text-decoration: underline;
            }

            /* Lists */
            ul, ol {
              margin-top: 0;
              margin-bottom: 10px;
              padding-left: 20px;
            }

            /* Tables */
            table {
              border-collapse: collapse;
              border-spacing: 0;
              width: 100%;
              max-width: 100%;
              margin-bottom: 20px;
              background-color: transparent;
            }
            th, td {
              padding: 8px;
              line-height: var(--line-height-base);
              vertical-align: top;
              border-top: 1px solid #ddd;
            }
            th {
              text-align: left;
              font-weight: 600;
              background-color: #f9f9f9;
            }

            /* Form Controls */
            label {
              display: inline-block;
              max-width: 100%;
              margin-bottom: 5px;
              font-weight: 600;
              color: var(--gray-dark);
            }

            input[type="text"],
            input[type="password"],
            input[type="email"],
            input[type="number"],
            input[type="search"],
            input[type="tel"],
            input[type="url"],
            input[type="date"],
            input[type="datetime-local"],
            input[type="time"],
            textarea,
            select {
              display: block;
              width: 100%;
              height: var(--form-input-height);
              padding: var(--form-input-padding-y) var(--form-input-padding-x);
              font-size: var(--font-size-default);
              font-family: var(--font-family-base);
              line-height: var(--line-height-base);
              color: var(--gray-dark);
              background-color: var(--form-input-bg);
              background-image: none;
              border: 1px solid var(--form-input-border-color);
              border-radius: var(--form-input-border-radius);
              transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
            }

            input:focus,
            textarea:focus,
            select:focus {
              border-color: var(--brand-primary);
              outline: 0;
              box-shadow: 0 0 0 3px rgba(5, 149, 219, 0.25);
            }

            input::placeholder,
            textarea::placeholder {
              color: var(--gray-light);
              opacity: 1;
            }

            input:disabled,
            textarea:disabled,
            select:disabled {
              background-color: var(--gray-lighter);
              opacity: 1;
              cursor: not-allowed;
            }

            textarea {
              height: auto;
              min-height: 80px;
              resize: vertical;
            }

            select {
              cursor: pointer;
            }

            /* Checkboxes & Radios */
            input[type="checkbox"],
            input[type="radio"] {
              width: 16px;
              height: 16px;
              margin: 0 8px 0 0;
              cursor: pointer;
              vertical-align: middle;
            }

            /* Buttons */
            button,
            input[type="button"],
            input[type="submit"],
            input[type="reset"],
            .btn {
              display: inline-block;
              margin-bottom: 0;
              font-family: var(--font-family-base);
              font-size: var(--font-size-default);
              font-weight: 400;
              line-height: var(--line-height-base);
              text-align: center;
              white-space: nowrap;
              vertical-align: middle;
              touch-action: manipulation;
              cursor: pointer;
              user-select: none;
              background-image: none;
              border: 1px solid transparent;
              border-radius: var(--form-input-border-radius);
              padding: 6px 12px;
              transition: all 0.15s ease-in-out;
            }

            /* Default button */
            button,
            .btn {
              color: var(--gray-dark);
              background-color: var(--brand-default);
              border-color: #ccc;
            }
            button:hover,
            .btn:hover {
              background-color: #c4c4c4;
              border-color: #adadad;
            }
            button:focus,
            .btn:focus {
              outline: 0;
              box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
            }
            button:active,
            .btn:active {
              background-color: #b8b8b8;
            }
            button:disabled,
            .btn:disabled {
              cursor: not-allowed;
              opacity: 0.65;
            }

            /* Primary button */
            .btn-primary,
            button.btn-primary {
              color: #fff;
              background-color: var(--brand-primary);
              border-color: var(--brand-primary);
            }
            .btn-primary:hover {
              background-color: #0477ab;
              border-color: #046a9a;
            }

            /* Success button */
            .btn-success,
            button.btn-success {
              color: #fff;
              background-color: var(--brand-success);
              border-color: var(--brand-success);
            }
            .btn-success:hover {
              background-color: #5fa002;
              border-color: #548e02;
            }

            /* Danger button */
            .btn-danger,
            button.btn-danger {
              color: #fff;
              background-color: var(--brand-danger);
              border-color: var(--brand-danger);
            }
            .btn-danger:hover {
              background-color: #c9151c;
              border-color: #b81319;
            }

            /* Warning button */
            .btn-warning,
            button.btn-warning {
              color: #fff;
              background-color: var(--brand-warning);
              border-color: var(--brand-warning);
            }
            .btn-warning:hover {
              background-color: #e08a0b;
              border-color: #ce7f0a;
            }

            /* Info button */
            .btn-info,
            button.btn-info {
              color: #fff;
              background-color: var(--brand-info);
              border-color: var(--brand-info);
            }
            .btn-info:hover {
              background-color: #1a9ff4;
              border-color: #0d96ed;
            }

            /* Inverse button */
            .btn-inverse,
            button.btn-inverse {
              color: #fff;
              background-color: var(--brand-inverse);
              border-color: var(--brand-inverse);
            }
            .btn-inverse:hover {
              background-color: #161a1e;
              border-color: #0d0f11;
            }

            /* Alerts */
            .alert {
              padding: 15px;
              margin-bottom: 20px;
              border: 1px solid transparent;
              border-radius: var(--form-input-border-radius);
            }
            .alert-success {
              color: #3c763d;
              background-color: #dff0d8;
              border-color: #d6e9c6;
            }
            .alert-info {
              color: #31708f;
              background-color: #d9edf7;
              border-color: #bce8f1;
            }
            .alert-warning {
              color: #8a6d3b;
              background-color: #fcf8e3;
              border-color: #faebcc;
            }
            .alert-danger {
              color: #a94442;
              background-color: #f2dede;
              border-color: #ebccd1;
            }

            /* Utility Classes */
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-muted { color: var(--gray-light); }
            .text-primary { color: var(--brand-primary); }
            .text-success { color: var(--brand-success); }
            .text-info { color: var(--brand-info); }
            .text-warning { color: var(--brand-warning); }
            .text-danger { color: var(--brand-danger); }

            .pull-left { float: left; }
            .pull-right { float: right; }
            .clearfix::after {
              display: block;
              clear: both;
              content: "";
            }

            .hidden { display: none !important; }
            .visible { display: block !important; }

            /* Spacing utilities */
            .m-0 { margin: 0; }
            .mt-1 { margin-top: var(--spacing-small); }
            .mt-2 { margin-top: var(--spacing-medium); }
            .mt-3 { margin-top: var(--spacing-large); }
            .mb-1 { margin-bottom: var(--spacing-small); }
            .mb-2 { margin-bottom: var(--spacing-medium); }
            .mb-3 { margin-bottom: var(--spacing-large); }
            .p-0 { padding: 0; }
            .p-1 { padding: var(--spacing-small); }
            .p-2 { padding: var(--spacing-medium); }
            .p-3 { padding: var(--spacing-large); }

            /* Preview States */
            .preview-error {
              color: var(--brand-danger);
              padding: 16px;
              background: #ffebee;
              border-radius: var(--form-input-border-radius);
              border-left: 4px solid var(--brand-danger);
            }
            .preview-loading {
              text-align: center;
              padding: 32px;
              color: var(--gray-light);
            }
          </style>
          <style>
            ${safeCss}
          </style>
        </head>
        <body>
          <!-- Hidden elements for SpreadJS to read CSS styles via getComputedStyle -->
          <div style="position:absolute;left:-9999px;top:-9999px;visibility:hidden;">
            <div class="gc-colHeaderFill"></div>
            <div class="gc-rowHeaderFill"></div>
            <div class="gc-selection"></div>
            <div class="gc-gridlineColor"></div>
            <div class="gc-corner-normal"></div>
            <div class="gc-grayArea"></div>
            <div class="gc-columnHeader-normal"></div>
            <div class="gc-columnHeader-hover"></div>
            <div class="gc-columnHeader-selected"></div>
            <div class="gc-rowHeader-normal"></div>
            <div class="gc-rowHeader-hover"></div>
            <div class="gc-rowHeader-selected"></div>
          </div>
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

                const executeBundle = () => {
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
                    } else if (itemPropType === 'integer') {
                      mappedItem[itemKey] = parseInt(itemValue, 10) || 0;
                    } else if (itemPropType === 'decimal') {
                      mappedItem[itemKey] = parseFloat(itemValue) || 0;
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
                    } else if (propType === 'integer') {
                      widgetProps[key] = parseInt(value, 10) || 0;
                    } else if (propType === 'decimal') {
                      widgetProps[key] = parseFloat(value) || 0;
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
                };

                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    try {
                      executeBundle();
                    } catch (error) {
                      console.error('[Widget Preview] Bundle execution error:', error);
                      const container = document.getElementById('widget-root');
                      if (container) {
                        container.innerHTML = '<div class="preview-error"><strong>Preview Error</strong><br/>' + error.message + '</div>';
                      }
                    }
                  });
                });

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
