import * as R from "ramda";
import { memo } from "react";

// ============= Helper Functions =============

// Extract value from event
const getEventValue = R.path(["target", "value"]);
const getEventChecked = R.path(["target", "checked"]);

// Create change handler for different input types
const createChangeHandler = R.curry((onChange, type, event) => {
  const value = R.cond([
    [R.equals("boolean"), R.always(getEventChecked(event))],
    [
      R.equals("integer"),
      R.pipe(getEventValue, (val) => (val === "" ? "" : parseInt(val, 10))),
    ],
    [
      R.equals("decimal"),
      R.pipe(getEventValue, (val) => (val === "" ? "" : parseFloat(val))),
    ],
    [R.T, R.always(getEventValue(event))],
  ])(type);

  return onChange(value);
});

// Validate input value
const validateInput = R.curry((property, value) => {
  const type = R.prop("type", property);
  const required = R.prop("required", property);

  // Check required
  if (
    required &&
    (R.isNil(value) ||
      value === "" ||
      (typeof value === "string" && value.trim() === ""))
  ) {
    return { isValid: false, error: "This field is required" };
  }

  // Type-specific validation
  return R.cond([
    [
      R.equals("integer"),
      () => {
        if (value === "" || R.isNil(value))
          return { isValid: true, error: null };
        const num = parseInt(value, 10);
        return isNaN(num)
          ? { isValid: false, error: "Must be a valid integer" }
          : { isValid: true, error: null };
      },
    ],
    [
      R.equals("decimal"),
      () => {
        if (value === "" || R.isNil(value))
          return { isValid: true, error: null };
        const num = parseFloat(value);
        return isNaN(num)
          ? { isValid: false, error: "Must be a valid decimal number" }
          : { isValid: true, error: null };
      },
    ],
    [
      R.equals("enumeration"),
      () => {
        const options = R.prop("options", property);
        return value === "" || R.isNil(value) || R.includes(value, options)
          ? { isValid: true, error: null }
          : { isValid: false, error: "Must be one of the available options" };
      },
    ],
    [R.T, R.always({ isValid: true, error: null })],
  ])(type);
});

// ============= Input Renderers =============

// Render text input
const renderTextInput = R.curry((property, value, onChange, disabled) => (
  <input
    type="text"
    className="property-input"
    value={value || ""}
    onChange={createChangeHandler(onChange, "string")}
    disabled={disabled}
    placeholder={R.prop("description", property)}
  />
));

// Render textarea
const renderTextarea = R.curry((property, value, onChange, disabled) => (
  <textarea
    className="property-textarea"
    rows="4"
    value={value || ""}
    onChange={createChangeHandler(onChange, "string")}
    disabled={disabled}
    placeholder={R.prop("description", property)}
  />
));

// Render number input
const renderNumberInput = R.curry((property, value, onChange, disabled) => {
  const type = R.prop("type", property);
  const step = R.equals("decimal", type) ? "0.01" : "1";

  return (
    <input
      type="number"
      step={step}
      className="property-input"
      value={value || ""}
      onChange={createChangeHandler(onChange, type)}
      disabled={disabled}
      placeholder={R.prop("description", property)}
    />
  );
});

// Render checkbox
const renderCheckbox = R.curry((property, value, onChange, disabled) => (
  <div className="property-checkbox-container">
    <input
      type="checkbox"
      className="property-checkbox"
      checked={Boolean(value)}
      onChange={createChangeHandler(onChange, "boolean")}
      disabled={disabled}
    />
    <span className="property-checkbox-label">
      {R.prop("description", property)}
    </span>
  </div>
));

// Render select dropdown
const renderSelect = R.curry((property, value, onChange, disabled) => {
  const options = R.prop("options", property);
  const hasEmptyOption = !R.includes("", options);

  return (
    <select
      className="property-select"
      value={value || ""}
      onChange={createChangeHandler(onChange, "enumeration")}
      disabled={disabled}
    >
      {hasEmptyOption && <option value="">Select...</option>}
      {R.map(
        (option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ),
        options,
      )}
    </select>
  );
});

// Render file input
const renderFileInput = R.curry((property, value, onChange, disabled) => (
  <input
    type="file"
    className="property-input"
    onChange={createChangeHandler(onChange, "file")}
    disabled={disabled}
  />
));

// Render placeholder for unsupported types
const renderPlaceholder = R.curry((property, value, onChange, disabled) => (
  <div className="property-placeholder">
    <span className="placeholder-icon">🔧</span>
    <span className="placeholder-text">
      {R.prop("type", property)} type not yet supported
    </span>
  </div>
));

// ============= Input Type Mapping =============

// Map property types to renderers
const inputRenderers = {
  string: renderTextInput,
  boolean: renderCheckbox,
  integer: renderNumberInput,
  decimal: renderNumberInput,
  enumeration: renderSelect,
  expression: renderTextarea,
  textTemplate: renderTextarea,
  file: renderFileInput,
  action: renderPlaceholder,
  attribute: renderPlaceholder,
  association: renderPlaceholder,
  object: renderPlaceholder,
  datasource: renderPlaceholder,
  icon: renderPlaceholder,
  image: renderPlaceholder,
  widgets: renderPlaceholder,
};

// Get renderer for property type
const getRenderer = (type) => R.propOr(renderPlaceholder, type, inputRenderers);

// ============= Validation Display =============

// Render validation error
const renderValidationError = R.curry((error) =>
  error ? (
    <div className="property-error">
      <span className="error-icon">⚠️</span>
      <span className="error-text">{error}</span>
    </div>
  ) : null,
);

// Render property description
const renderDescription = R.curry((description) =>
  description ? (
    <div className="property-description">
      <span className="description-text">{description}</span>
    </div>
  ) : null,
);

// ============= Main Component =============

// DynamicPropertyInput component
const DynamicPropertyInput = memo(
  ({ property, value, onChange, disabled = false, showValidation = true }) => {
    const type = R.prop("type", property);
    const caption = R.prop("caption", property);
    const description = R.prop("description", property);
    const required = R.prop("required", property);

    // Validate current value
    const validation = showValidation
      ? validateInput(property, value)
      : { isValid: true, error: null };

    // Get appropriate renderer
    const renderer = getRenderer(type);

    // Create input element
    const inputElement = renderer(property, value, onChange, disabled);

    // Determine container class
    const containerClass = R.pipe(
      R.always([
        "dynamic-property-input",
        required ? "required" : "",
        !validation.isValid ? "invalid" : "",
        disabled ? "disabled" : "",
      ]),
      R.filter(R.identity),
      R.join(" "),
    )();

    return (
      <div className={containerClass}>
        {/* Property Label */}
        <label className="property-label">
          <span className="label-text">
            {caption}
            {required && <span className="required-indicator"> *</span>}
          </span>

          {/* Input Element */}
          {inputElement}

          {/* Property Description */}
          {!R.equals(type, "boolean") && renderDescription(description)}

          {/* Validation Error */}
          {showValidation && renderValidationError(validation.error)}
        </label>
      </div>
    );
  },
);

DynamicPropertyInput.displayName = "DynamicPropertyInput";

export default DynamicPropertyInput;
