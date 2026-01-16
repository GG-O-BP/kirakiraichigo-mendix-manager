import * as R from "ramda";
import { memo } from "react";

const extractInputValue = R.path(["target", "value"]);

const createInputChangeHandler = R.curry((onChange, event) =>
  R.pipe(extractInputValue, onChange)(event),
);

const TEXTAREA_ROWS = 4;

const renderTextInput = R.curry((value, onChange, disabled) => (
  <input
    type="text"
    className="property-input"
    value={value}
    onChange={createInputChangeHandler(onChange)}
    disabled={disabled}
  />
));

const renderTextarea = R.curry((value, onChange, disabled) => (
  <textarea
    className="property-textarea"
    rows={TEXTAREA_ROWS}
    value={value}
    onChange={createInputChangeHandler(onChange)}
    disabled={disabled}
  />
));

const renderSelectOption = (option) => (
  <option key={option} value={option}>
    {option}
  </option>
);

const renderSelect = R.curry((value, onChange, options, disabled) => (
  <select
    className="property-select"
    value={value}
    onChange={createInputChangeHandler(onChange)}
    disabled={disabled}
  >
    {R.map(renderSelectOption, options)}
  </select>
));

const PROPERTY_TYPE_RENDERERS = {
  text: renderTextInput,
  textarea: renderTextarea,
  select: renderSelect,
};

const getRendererByType = (type) =>
  R.propOr(R.always(null), type, PROPERTY_TYPE_RENDERERS);

const renderInputByType = R.curry((type, value, onChange, options, disabled) => {
  const renderer = getRendererByType(type);
  const isSelectType = type === "select";
  return isSelectType
    ? renderer(value, onChange, options, disabled)
    : renderer(value, onChange, disabled);
});

const PropertyInput = memo(
  ({ label, type, value, onChange, options = [], disabled = false }) => (
    <label className="property-label">
      <span className="label-text">{label}</span>
      {renderInputByType(type, value, onChange, options, disabled)}
    </label>
  ),
);

PropertyInput.displayName = "PropertyInput";

export default PropertyInput;
