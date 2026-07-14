import * as R from "ramda";
import { memo, useEffect, useMemo } from "react";
import { createTypedChangeHandler } from "../../utils";
import { validatePropertyValue, validateJson } from "../../schemas";
import Dropdown from "./Dropdown";
import ObjectListPropertyInput from "./ObjectListPropertyInput";

const DECIMAL_STEP = 0.01;
const INTEGER_STEP = 1;
const DECIMAL_PRECISION_MULTIPLIER = 100;

const renderTextInput = R.curry((property, value, onChange, disabled) => (
  <div className="text-input-container">
    <input
      type="text"
      className="property-input text-input"
      value={R.defaultTo("", value)}
      onChange={createTypedChangeHandler(onChange, "string")}
      disabled={disabled}
    />
  </div>
));

const renderTextarea = R.curry((property, value, onChange, disabled) => (
  <textarea
    className="property-textarea"
    rows="4"
    value={R.defaultTo("", value)}
    onChange={createTypedChangeHandler(onChange, "string")}
    disabled={disabled}
    placeholder={R.prop("description", property)}
  />
));

const renderNumberInput = R.curry((property, value, onChange, disabled) => {
  const type = R.prop("type", property);
  const isDecimal = R.equals("decimal", type);
  const step = R.ifElse(R.identity, R.always(DECIMAL_STEP), R.always(INTEGER_STEP))(isDecimal);
  const numValue = R.ifElse(
    R.either(R.equals(""), R.isNil),
    R.always(0),
    Number,
  )(value);

  const roundDecimalPrecision = (num) =>
    R.divide(
      Math.round(R.multiply(num, DECIMAL_PRECISION_MULTIPLIER)),
      DECIMAL_PRECISION_MULTIPLIER,
    );

  const calculateNewValue = (currentValue, delta) =>
    R.ifElse(
      R.always(isDecimal),
      roundDecimalPrecision,
      R.identity,
    )(R.add(currentValue, delta));

  const handleDecrement = () =>
    R.unless(
      R.identity,
      () => onChange(calculateNewValue(numValue, R.negate(step))),
    )(disabled);

  const handleIncrement = () =>
    R.unless(
      R.identity,
      () => onChange(calculateNewValue(numValue, step)),
    )(disabled);

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
        value={R.defaultTo("", value)}
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

  return (
    <Dropdown
      value={R.when(
        R.either(R.isNil, R.isEmpty),
        R.always(R.propOr("", 0, options)),
      )(value)}
      onChange={onChange}
      options={options}
      disabled={disabled}
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

const DATASOURCE_DEFAULT_VALUE = `[
  {
    "id": 1,
    "name": "Item 1",
    "value": 100,
    "active": true
  },
  {
    "id": 2,
    "name": "Item 2",
    "value": 200,
    "active": false
  }
]`;

const DatasourceTextarea = ({ value, onChange, disabled }) => {
  useEffect(() => {
    R.when(
      R.either(R.isNil, R.isEmpty),
      () => onChange(DATASOURCE_DEFAULT_VALUE),
    )(value);
  }, []);

  const handleChange = (e) => {
    const newValue = R.path(["target", "value"], e);
    onChange(newValue);
  };

  const jsonValid = validateJson(value);

  return (
    <div className="datasource-textarea-container">
      <textarea
        className={`property-textarea datasource-json ${R.ifElse(R.identity, R.always(""), R.always("invalid-json"))(jsonValid)}`}
        rows="6"
        value={R.defaultTo("", value)}
        onChange={handleChange}
        disabled={disabled}
        placeholder={DATASOURCE_DEFAULT_VALUE}
      />
      {R.ifElse(
        R.not,
        () => (<div className="json-error-hint">Invalid JSON format</div>),
        R.always(null),
      )(jsonValid)}
    </div>
  );
};

const renderDatasourceTextarea = R.curry((property, value, onChange, disabled) => (
  <DatasourceTextarea value={value} onChange={onChange} disabled={disabled} />
));

const extractKeysFromParsedJson = R.cond([
  [R.isNil, R.always([])],
  [
    R.is(Array),
    R.pipe(
      R.head,
      R.ifElse(R.both(R.isNotNil, R.is(Object)), R.keys, R.always([])),
    ),
  ],
  [R.is(Object), R.keys],
  [R.T, R.always([])],
]);

const isStringType = R.pipe(R.type, R.equals("String"));

const safeJsonParse = R.tryCatch(JSON.parse, R.always(null));

const extractDatasourceKeys = (allProperties, dataSourceKey) =>
  R.pipe(
    R.prop(dataSourceKey),
    R.ifElse(
      R.both(R.isNotNil, isStringType),
      R.pipe(
        safeJsonParse,
        R.ifElse(R.isNil, R.always([]), extractKeysFromParsedJson),
      ),
      R.always([]),
    ),
  )(allProperties);

const resolveDataSourcePath = (dataSourceKey, allProperties, parentProperties) =>
  R.ifElse(
    R.isNil,
    R.always({ resolvedKey: null, targetProperties: allProperties }),
    R.ifElse(
      R.startsWith("../"),
      (parentKey) => ({
        resolvedKey: R.replace(/^\.\.\//, "", parentKey),
        targetProperties: parentProperties,
      }),
      (ownKey) => ({ resolvedKey: ownKey, targetProperties: allProperties }),
    ),
  )(dataSourceKey);

const renderAttributeSelect = R.curry(
  (property, value, onChange, disabled, allProperties, parentProperties) => {
    const dataSourceKey = R.prop("dataSource", property);
    const { resolvedKey, targetProperties } = resolveDataSourcePath(
      dataSourceKey,
      allProperties,
      parentProperties
    );
    const datasourceKeys = R.pipe(
      R.ifElse(
        R.isNil,
        R.always([]),
        (key) => extractDatasourceKeys(targetProperties, key),
      ),
      R.ifElse(R.is(Array), R.identity, R.always([])),
    )(resolvedKey);

    const hasNoDataSource = R.isNil(dataSourceKey);
    const datasourceValue = R.prop(resolvedKey, targetProperties);
    const hasNoDatasourceValue = R.and(
      R.isNotNil(dataSourceKey),
      R.either(R.isNil, R.isEmpty)(datasourceValue),
    );

    return (
      <div className="attribute-select-container">
        <Dropdown
          value={R.defaultTo("", value)}
          onChange={onChange}
          options={datasourceKeys}
          disabled={R.or(disabled, R.isEmpty(datasourceKeys))}
          placeholder="Select attribute..."
        />
        {R.ifElse(
          R.identity,
          () => (<div className="attribute-hint">No datasource linked</div>),
          R.always(null),
        )(hasNoDataSource)}
        {R.ifElse(
          R.identity,
          () => (
            <div className="attribute-hint">
              Enter JSON in "{resolvedKey}" first
            </div>
          ),
          R.always(null),
        )(hasNoDatasourceValue)}
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
  selection: renderSelect,
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

const renderValidationError = (error) =>
  R.ifElse(
    R.either(R.isNil, R.isEmpty),
    R.always(null),
    (message) => (
      <div className="property-error">
        <span className="error-icon">⚠️</span>
        <span className="error-text">{message}</span>
      </div>
    ),
  )(error);

const renderDescription = (description) =>
  R.ifElse(
    R.either(R.isNil, R.isEmpty),
    R.always(null),
    (text) => (
      <div className="property-description">
        <span className="description-text">{text}</span>
      </div>
    ),
  )(description);

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

    const validation = R.ifElse(
      R.identity,
      () => validatePropertyValue(property, value),
      R.always({ isValid: true, error: null }),
    )(showValidation);

    const inputElement = useMemo(
      () =>
        R.cond([
          [
            R.always(isObjectList),
            () => (
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
            ),
          ],
          [
            R.always(R.equals("attribute", type)),
            () => renderAttributeSelect(property, value, onChange, disabled, allProperties, parentProperties),
          ],
          [R.T, () => getRenderer(type)(property, value, onChange, disabled)],
        ])(),
      [type, property, value, onChange, disabled, allProperties, parentProperties, isObjectList, propertyKey, onAddArrayItem, onRemoveArrayItem, onUpdateArrayItemProperty],
    );

    return R.ifElse(
      R.identity,
      R.always(inputElement),
      () => {
        const containerClass = R.pipe(
          R.always([
            "dynamic-property-input",
            R.ifElse(R.identity, R.always("required"), R.always(""))(required),
            R.ifElse(R.prop("isValid"), R.always(""), R.always("invalid"))(validation),
            R.ifElse(R.identity, R.always("disabled"), R.always(""))(disabled),
          ]),
          R.filter(R.identity),
          R.join(" "),
        )();

        const isNumberType = R.includes(type, ["integer", "decimal"]);
        const WrapperElement = R.ifElse(R.identity, R.always("div"), R.always("label"))(isNumberType);

        return (
          <div className={containerClass}>
            <WrapperElement className="property-label">
              <span className="label-text">
                {caption}
                {R.ifElse(
                  R.identity,
                  () => (<span className="required-indicator"> *</span>),
                  R.always(null),
                )(required)}
              </span>
              {inputElement}
              {R.ifElse(
                R.equals("boolean"),
                R.always(null),
                () => renderDescription(description),
              )(type)}
              {R.ifElse(
                R.identity,
                () => renderValidationError(R.prop("error", validation)),
                R.always(null),
              )(showValidation)}
            </WrapperElement>
          </div>
        );
      },
    )(isObjectList);
  },
);

DynamicPropertyInput.displayName = "DynamicPropertyInput";

export default DynamicPropertyInput;
