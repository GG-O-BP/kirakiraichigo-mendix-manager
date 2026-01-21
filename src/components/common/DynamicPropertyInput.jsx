import * as R from "ramda";
import { memo, useMemo } from "react";
import { createTypedChangeHandler } from "../../utils";
import Dropdown from "./Dropdown";
import ObjectListPropertyInput from "./ObjectListPropertyInput";

const DECIMAL_STEP = 0.01;
const INTEGER_STEP = 1;
const DECIMAL_PRECISION_MULTIPLIER = 100;

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
  <div className="text-input-container">
    <input
      type="text"
      className="property-input text-input"
      value={value || ""}
      onChange={createTypedChangeHandler(onChange, "string")}
      disabled={disabled}
    />
  </div>
));

const renderTextarea = R.curry((property, value, onChange, disabled) => (
  <textarea
    className="property-textarea"
    rows="4"
    value={value || ""}
    onChange={createTypedChangeHandler(onChange, "string")}
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
        onChange={createTypedChangeHandler(onChange, type)}
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
      onChange={createTypedChangeHandler(onChange, "boolean")}
      disabled={disabled}
    />
    <span className="property-checkbox-label">
      {R.prop("description", property)}
    </span>
  </div>
));

const renderSelect = R.curry((property, value, onChange, disabled) => {
  const options = R.prop("options", property);
  const needsPlaceholder = !R.includes("", options);

  return (
    <Dropdown
      value={value || ""}
      onChange={onChange}
      options={options}
      disabled={disabled}
      placeholder={needsPlaceholder ? "Select..." : null}
    />
  );
});

const renderFileInput = R.curry((property, value, onChange, disabled) => (
  <input
    type="file"
    className="property-input"
    onChange={createTypedChangeHandler(onChange, "file")}
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

const renderDatasourceTextarea = R.curry((property, value, onChange, disabled) => {
  const handleChange = (e) => {
    const newValue = R.path(["target", "value"], e);
    onChange(newValue);
  };

  const isValidJson = R.tryCatch(
    R.pipe(JSON.parse, R.always(true)),
    R.always(false),
  );

  const jsonValid = R.ifElse(
    R.either(R.isNil, R.isEmpty),
    R.always(true),
    isValidJson,
  )(value);

  return (
    <div className="datasource-textarea-container">
      <textarea
        className={`property-textarea datasource-json ${jsonValid ? "" : "invalid-json"}`}
        rows="6"
        value={value || ""}
        onChange={handleChange}
        disabled={disabled}
        placeholder='{"key1": "value1", "key2": "value2"}'
      />
      {R.not(jsonValid) && (
        <div className="json-error-hint">Invalid JSON format</div>
      )}
    </div>
  );
});

const extractKeysFromParsedJson = R.cond([
  [R.isNil, R.always([])],
  [
    R.is(Array),
    R.pipe(
      R.head,
      R.ifElse(R.both(R.complement(R.isNil), R.is(Object)), R.keys, R.always([])),
    ),
  ],
  [R.is(Object), R.keys],
  [R.T, R.always([])],
]);

const isStringType = R.pipe(R.type, R.equals("String"));

const safeJsonParse = R.tryCatch(JSON.parse, R.always(null));

const extractDatasourceKeys = (allProperties, dataSourceKey) => {
  const datasourceValue = R.prop(dataSourceKey, allProperties);
  const isValidString = R.both(R.complement(R.isNil), isStringType)(datasourceValue);

  if (!isValidString) {
    return [];
  }

  const parsed = safeJsonParse(datasourceValue);

  if (R.isNil(parsed)) {
    return [];
  }

  return extractKeysFromParsedJson(parsed);
};

const resolveDataSourcePath = (dataSourceKey, allProperties, parentProperties) => {
  if (R.isNil(dataSourceKey)) {
    return { resolvedKey: null, targetProperties: allProperties };
  }
  const isParentRef = R.startsWith("../", dataSourceKey);
  const resolvedKey = isParentRef ? R.replace(/^\.\.\//, "", dataSourceKey) : dataSourceKey;
  const targetProperties = isParentRef ? parentProperties : allProperties;
  return { resolvedKey, targetProperties };
};

const renderAttributeSelect = R.curry(
  (property, value, onChange, disabled, allProperties, parentProperties) => {
    const dataSourceKey = R.prop("dataSource", property);
    const { resolvedKey, targetProperties } = resolveDataSourcePath(
      dataSourceKey,
      allProperties,
      parentProperties
    );
    const extractResult = R.isNil(resolvedKey)
      ? []
      : extractDatasourceKeys(targetProperties, resolvedKey);
    const datasourceKeys = Array.isArray(extractResult) ? extractResult : [];

    const hasNoDataSource = R.isNil(dataSourceKey);
    const datasourceValue = R.prop(resolvedKey, targetProperties);
    const hasNoDatasourceValue = R.and(
      R.complement(R.isNil)(dataSourceKey),
      R.either(R.isNil, R.isEmpty)(datasourceValue),
    );

    return (
      <div className="attribute-select-container">
        <Dropdown
          value={value || ""}
          onChange={onChange}
          options={datasourceKeys}
          disabled={R.or(disabled, R.isEmpty(datasourceKeys))}
          placeholder="Select attribute..."
        />
        {hasNoDataSource && (
          <div className="attribute-hint">No datasource linked</div>
        )}
        {hasNoDatasourceValue && (
          <div className="attribute-hint">
            Enter JSON in "{resolvedKey}" first
          </div>
        )}
      </div>
    );
  },
);

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
  attribute: null,
  association: renderPlaceholder,
  object: renderPlaceholder,
  datasource: renderDatasourceTextarea,
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
  ({
    property,
    value,
    onChange,
    disabled = false,
    showValidation = true,
    allProperties = {},
    parentProperties = {},
    onAddArrayItem,
    onRemoveArrayItem,
    onUpdateArrayItemProperty,
  }) => {
    const type = R.prop("type", property);
    const caption = R.prop("caption", property);
    const description = R.prop("description", property);
    const required = R.prop("required", property);
    const isList = R.prop("isList", property);
    const propertyKey = R.prop("key", property);

    const isObjectList = R.and(R.equals("object", type), isList);

    const validation = showValidation
      ? validateInput(property, value)
      : { isValid: true, error: null };

    const inputElement = useMemo(() => {
      if (isObjectList) {
        return (
          <ObjectListPropertyInput
            property={property}
            items={value}
            onAddItem={(defaultItem) => onAddArrayItem(propertyKey, defaultItem)}
            onRemoveItem={(index) => onRemoveArrayItem(propertyKey, index)}
            onUpdateItemProperty={(index, nestedKey, nestedValue) =>
              onUpdateArrayItemProperty(propertyKey, index, nestedKey, nestedValue)
            }
            disabled={disabled}
            parentProperties={allProperties}
          />
        );
      }

      const isAttributeType = R.equals("attribute", type);

      return R.ifElse(
        R.always(isAttributeType),
        R.always(renderAttributeSelect(property, value, onChange, disabled, allProperties, parentProperties)),
        R.always(getRenderer(type)(property, value, onChange, disabled)),
      )();
    }, [type, property, value, onChange, disabled, allProperties, parentProperties, isObjectList, propertyKey, onAddArrayItem, onRemoveArrayItem, onUpdateArrayItemProperty]);

    if (isObjectList) {
      return inputElement;
    }

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
