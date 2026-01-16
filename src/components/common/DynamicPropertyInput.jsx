import * as R from "ramda";
import { memo } from "react";

const DECIMAL_STEP = 0.01;
const INTEGER_STEP = 1;
const DECIMAL_PRECISION_MULTIPLIER = 100;

const extractInputValue = R.path(["target", "value"]);
const extractCheckboxState = R.path(["target", "checked"]);

const parseIntegerOrEmpty = (value) =>
  value === "" ? "" : parseInt(value, 10);

const parseDecimalOrEmpty = (value) =>
  value === "" ? "" : parseFloat(value);

const createChangeHandler = R.curry((onChange, type, event) => {
  const rawValue = extractInputValue(event);

  const value = R.cond([
    [R.equals("boolean"), R.always(extractCheckboxState(event))],
    [R.equals("integer"), R.always(parseIntegerOrEmpty(rawValue))],
    [R.equals("decimal"), R.always(parseDecimalOrEmpty(rawValue))],
    [R.T, R.always(rawValue)],
  ])(type);

  return onChange(value);
});

const validateInput = R.curry((property, value) => {
  const type = R.prop("type", property);

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

const renderNumberInput = R.curry((property, value, onChange, disabled) => {
  const type = R.prop("type", property);
  const isDecimal = R.equals("decimal", type);
  const step = isDecimal ? DECIMAL_STEP : INTEGER_STEP;
  const numValue = value === "" || R.isNil(value) ? 0 : Number(value);

  const roundDecimalPrecision = (num) =>
    Math.round(num * DECIMAL_PRECISION_MULTIPLIER) / DECIMAL_PRECISION_MULTIPLIER;

  const calculateNewValue = (currentValue, delta) =>
    isDecimal ? roundDecimalPrecision(currentValue + delta) : currentValue + delta;

  const handleDecrement = () => {
    if (!disabled) {
      onChange(calculateNewValue(numValue, -step));
    }
  };

  const handleIncrement = () => {
    if (!disabled) {
      onChange(calculateNewValue(numValue, step));
    }
  };

  return (
    <div className="number-input-container">
      <button
        type="button"
        className="number-input-btn decrement"
        onClick={handleDecrement}
        disabled={disabled}
        aria-label="Decrease value"
      >
        −
      </button>
      <input
        type="number"
        step={step}
        className="property-input number-input"
        value={value ?? ""}
        onChange={createChangeHandler(onChange, type)}
        disabled={disabled}
        placeholder={R.prop("description", property)}
      />
      <button
        type="button"
        className="number-input-btn increment"
        onClick={handleIncrement}
        disabled={disabled}
        aria-label="Increase value"
      >
        +
      </button>
    </div>
  );
});

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

const renderSelect = R.curry((property, value, onChange, disabled) => {
  const options = R.prop("options", property);
  const needsPlaceholderOption = !R.includes("", options);

  return (
    <select
      className="property-select"
      value={value || ""}
      onChange={createChangeHandler(onChange, "enumeration")}
      disabled={disabled}
    >
      {needsPlaceholderOption && <option value="">Select...</option>}
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

const renderFileInput = R.curry((property, value, onChange, disabled) => (
  <input
    type="file"
    className="property-input"
    onChange={createChangeHandler(onChange, "file")}
    disabled={disabled}
  />
));

const renderPlaceholder = R.curry((property, value, onChange, disabled) => (
  <div className="property-placeholder">
    <span className="placeholder-icon">🔧</span>
    <span className="placeholder-text">
      {R.prop("type", property)} type not yet supported
    </span>
  </div>
));

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

const getRenderer = (type) => R.propOr(renderPlaceholder, type, inputRenderers);

const renderValidationError = R.curry((error) =>
  error ? (
    <div className="property-error">
      <span className="error-icon">⚠️</span>
      <span className="error-text">{error}</span>
    </div>
  ) : null,
);

const renderDescription = R.curry((description) =>
  description ? (
    <div className="property-description">
      <span className="description-text">{description}</span>
    </div>
  ) : null,
);

const DynamicPropertyInput = memo(
  ({ property, value, onChange, disabled = false, showValidation = true }) => {
    const type = R.prop("type", property);
    const caption = R.prop("caption", property);
    const description = R.prop("description", property);
    const required = R.prop("required", property);

    const validation = showValidation
      ? validateInput(property, value)
      : { isValid: true, error: null };

    const renderer = getRenderer(type);

    const inputElement = renderer(property, value, onChange, disabled);

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

    const isNumberType = R.includes(type, ["integer", "decimal"]);
    const WrapperElement = isNumberType ? "div" : "label";

    return (
      <div className={containerClass}>
        <WrapperElement className="property-label">
          <span className="label-text">
            {caption}
            {required && <span className="required-indicator"> *</span>}
          </span>
          {inputElement}
          {!R.equals(type, "boolean") && renderDescription(description)}
          {showValidation && renderValidationError(validation.error)}
        </WrapperElement>
      </div>
    );
  },
);

DynamicPropertyInput.displayName = "DynamicPropertyInput";

export default DynamicPropertyInput;
