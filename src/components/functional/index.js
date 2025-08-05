import * as R from "ramda";
import React, { memo, useMemo, useCallback, useState } from "react";
import {
  createCSSClass,
  createCSSVariables,
  styleToCSSString,
  mergeStyles,
  sanitizeProps,
  createMemoizer,
  shallowEqual,
} from "../../utils/functional";

// ============= Pure Functional Component Creators =============

// Create a pure functional component with memoization
export const createPureComponent = R.curry((displayName, renderFn) => {
  const Component = memo(renderFn, shallowEqual);
  Component.displayName = displayName;
  return Component;
});

// Higher-order component for adding functional props
export const withFunctionalProps = R.curry((propTransformers, Component) =>
  createPureComponent(
    `WithFunctionalProps(${Component.displayName})`,
    (props) =>
      React.createElement(
        Component,
        R.pipe(...R.values(propTransformers))(props),
      ),
  ),
);

// ============= CSS and Style Utilities =============

// Create CSS class names functionally
export const createClassName = R.curry((baseClass, conditionalClasses) =>
  R.pipe(
    R.toPairs,
    R.filter(R.nth(1)),
    R.map(R.nth(0)),
    R.prepend(baseClass),
    R.join(" "),
  )(conditionalClasses),
);

// Style object creator with CSS variables support
export const createStyledProps = R.curry((baseStyles, dynamicStyles) =>
  R.pipe(
    R.mergeDeepRight(baseStyles),
    R.when(
      R.has("cssVariables"),
      R.over(
        R.lensProp("style"),
        R.pipe(
          R.defaultTo({}),
          R.mergeRight(
            R.pipe(R.prop("cssVariables"), createCSSVariables, (vars) => ({
              "--custom-vars": vars,
            }))(dynamicStyles),
          ),
        ),
      ),
    ),
  )(dynamicStyles),
);

// ============= Lightningcss Optimized Components =============

// Berry-themed button component
export const BerryButton = createPureComponent(
  "BerryButton",
  ({
    variant = "primary",
    size = "medium",
    disabled = false,
    children,
    onClick,
    ...props
  }) => {
    const classNames = createClassName("berry-button", {
      [`berry-button--${variant}`]: true,
      [`berry-button--${size}`]: true,
      "berry-button--disabled": disabled,
    });

    const styles = useMemo(
      () => ({
        "--button-scale":
          size === "small" ? "0.875" : size === "large" ? "1.125" : "1",
        "--button-opacity": disabled ? "0.6" : "1",
      }),
      [size, disabled],
    );

    return React.createElement(
      "button",
      {
        className: classNames,
        style: styles,
        disabled,
        onClick: disabled ? R.identity : onClick,
        ...sanitizeProps(["id", "data-testid", "aria-label"], props),
      },
      children,
    );
  },
);

// Functional input component with validation
export const FunctionalInput = createPureComponent(
  "FunctionalInput",
  ({
    type = "text",
    value,
    onChange,
    placeholder,
    error,
    required = false,
    disabled = false,
    ...props
  }) => {
    const classNames = createClassName("functional-input", {
      "functional-input--error": Boolean(error),
      "functional-input--required": required,
      "functional-input--disabled": disabled,
    });

    const handleChange = useCallback(
      R.pipe(R.path(["target", "value"]), onChange),
      [onChange],
    );

    const containerStyles = useMemo(
      () => ({
        "--input-border-color": error
          ? "var(--error-color)"
          : "var(--border-color)",
        "--input-focus-color": error
          ? "var(--error-focus)"
          : "var(--primary-color)",
      }),
      [error],
    );

    return React.createElement(
      "div",
      {
        className: "functional-input-container",
        style: containerStyles,
      },
      [
        React.createElement("input", {
          key: "input",
          type,
          className: classNames,
          value: value || "",
          onChange: handleChange,
          placeholder,
          disabled,
          required,
          ...sanitizeProps(
            ["id", "name", "autoComplete", "data-testid"],
            props,
          ),
        }),
        error &&
          React.createElement(
            "div",
            {
              key: "error",
              className: "functional-input-error",
              role: "alert",
            },
            error,
          ),
      ],
    );
  },
);

// Functional dropdown with search
export const FunctionalDropdown = createPureComponent(
  "FunctionalDropdown",
  ({
    options = [],
    value,
    onChange,
    placeholder = "Select option...",
    searchable = false,
    disabled = false,
    ...props
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredOptions = useMemo(
      () =>
        searchable && searchTerm
          ? R.filter(
              R.pipe(
                R.prop("label"),
                R.toLower,
                R.includes(R.toLower(searchTerm)),
              ),
              options,
            )
          : options,
      [options, searchTerm, searchable],
    );

    const selectedOption = useMemo(
      () => R.find(R.propEq("value", value), options),
      [options, value],
    );

    const handleToggle = useCallback(() => setIsOpen(R.not), []);
    const handleSelect = useCallback(
      (option) => {
        onChange(R.prop("value", option));
        setIsOpen(false);
        setSearchTerm("");
      },
      [onChange],
    );

    const classNames = createClassName("functional-dropdown", {
      "functional-dropdown--open": isOpen,
      "functional-dropdown--disabled": disabled,
    });

    return React.createElement(
      "div",
      {
        className: classNames,
        ...sanitizeProps(["data-testid"], props),
      },
      [
        React.createElement(
          "button",
          {
            key: "trigger",
            type: "button",
            className: "functional-dropdown__trigger",
            onClick: disabled ? R.identity : handleToggle,
            disabled,
            "aria-haspopup": "listbox",
            "aria-expanded": isOpen,
          },
          [
            React.createElement(
              "span",
              {
                key: "label",
                className: "functional-dropdown__label",
              },
              selectedOption ? R.prop("label", selectedOption) : placeholder,
            ),
            React.createElement(
              "span",
              {
                key: "icon",
                className: "functional-dropdown__icon",
                "aria-hidden": true,
              },
              "🍓",
            ),
          ],
        ),
        isOpen &&
          React.createElement(
            "div",
            {
              key: "menu",
              className: "functional-dropdown__menu",
              role: "listbox",
            },
            [
              searchable &&
                React.createElement(FunctionalInput, {
                  key: "search",
                  type: "text",
                  value: searchTerm,
                  onChange: setSearchTerm,
                  placeholder: "Search options...",
                  className: "functional-dropdown__search",
                }),
              ...R.map(
                (option) =>
                  React.createElement(
                    "button",
                    {
                      key: R.prop("value", option),
                      type: "button",
                      className: createClassName(
                        "functional-dropdown__option",
                        {
                          "functional-dropdown__option--selected": R.equals(
                            value,
                            R.prop("value", option),
                          ),
                        },
                      ),
                      onClick: () => handleSelect(option),
                      role: "option",
                      "aria-selected": R.equals(value, R.prop("value", option)),
                    },
                    R.prop("label", option),
                  ),
                filteredOptions,
              ),
            ],
          ),
      ],
    );
  },
);

// ============= Layout Components =============

// Functional container with CSS Grid
export const FunctionalGrid = createPureComponent(
  "FunctionalGrid",
  ({
    columns = "1fr",
    rows = "auto",
    gap = "1rem",
    areas,
    children,
    ...props
  }) => {
    const styles = useMemo(
      () => ({
        display: "grid",
        gridTemplateColumns: columns,
        gridTemplateRows: rows,
        gap,
        ...(areas && { gridTemplateAreas: areas }),
      }),
      [columns, rows, gap, areas],
    );

    return React.createElement(
      "div",
      {
        className: "functional-grid",
        style: styles,
        ...sanitizeProps(["data-testid"], props),
      },
      children,
    );
  },
);

// Functional flexbox container
export const FunctionalFlex = createPureComponent(
  "FunctionalFlex",
  ({
    direction = "row",
    align = "stretch",
    justify = "flex-start",
    wrap = "nowrap",
    gap = "0",
    children,
    ...props
  }) => {
    const styles = useMemo(
      () => ({
        display: "flex",
        flexDirection: direction,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap,
        gap,
      }),
      [direction, align, justify, wrap, gap],
    );

    return React.createElement(
      "div",
      {
        className: "functional-flex",
        style: styles,
        ...sanitizeProps(["data-testid"], props),
      },
      children,
    );
  },
);

// ============= Animation and Transition Utilities =============

// CSS transition wrapper
export const withTransition = R.curry((transitionConfig, Component) =>
  createPureComponent(`WithTransition(${Component.displayName})`, (props) => {
    const transitionStyles = useMemo(
      () => ({
        transition: R.pipe(
          R.toPairs,
          R.map(([property, duration]) => `${property} ${duration}`),
          R.join(", "),
        )(transitionConfig),
      }),
      [],
    );

    return React.createElement(Component, {
      ...props,
      style: R.mergeRight(transitionStyles, props.style || {}),
    });
  }),
);

// Animation state manager
export const useAnimationState = (initialState = "idle") => {
  const [state, setState] = useState(initialState);

  const transitions = useMemo(
    () => ({
      start: () => setState("running"),
      pause: () => setState("paused"),
      stop: () => setState("idle"),
      complete: () => setState("completed"),
    }),
    [],
  );

  return [state, transitions];
};

// ============= Performance Optimization Components =============

// Virtualized list component
export const VirtualizedList = createPureComponent(
  "VirtualizedList",
  ({
    items,
    itemHeight = 50,
    containerHeight = 300,
    renderItem,
    overscan = 5,
    ...props
  }) => {
    const [scrollTop, setScrollTop] = useState(0);

    const visibleRange = useMemo(() => {
      const startIndex = Math.max(
        0,
        Math.floor(scrollTop / itemHeight) - overscan,
      );
      const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
      );
      return { startIndex, endIndex };
    }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

    const visibleItems = useMemo(
      () => R.slice(visibleRange.startIndex, visibleRange.endIndex + 1, items),
      [items, visibleRange],
    );

    const handleScroll = useCallback(
      R.pipe(R.path(["target", "scrollTop"]), setScrollTop),
      [],
    );

    return React.createElement(
      "div",
      {
        className: "virtualized-list",
        style: {
          height: containerHeight,
          overflow: "auto",
        },
        onScroll: handleScroll,
        ...sanitizeProps(["data-testid"], props),
      },
      [
        React.createElement("div", {
          key: "spacer-top",
          style: { height: visibleRange.startIndex * itemHeight },
        }),
        ...R.addIndex(R.map)(
          (item, index) => renderItem(item, visibleRange.startIndex + index),
          visibleItems,
        ),
        React.createElement("div", {
          key: "spacer-bottom",
          style: {
            height: (items.length - visibleRange.endIndex - 1) * itemHeight,
          },
        }),
      ],
    );
  },
);

// ============= Error Boundary Components =============

// Functional error boundary
export const createErrorBoundary = R.curry((fallbackRenderer, Component) => {
  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      console.error("Error caught by boundary:", error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return fallbackRenderer(this.state.error, this.props);
      }
      return React.createElement(Component, this.props);
    }
  }

  ErrorBoundary.displayName = `ErrorBoundary(${Component.displayName})`;
  return ErrorBoundary;
});

// ============= Export All Components =============

// All exports handled above - no need for duplicate export block

// Component library object
export const FunctionalComponents = {
  BerryButton,
  FunctionalInput,
  FunctionalDropdown,
  FunctionalGrid,
  FunctionalFlex,
  VirtualizedList,
};
