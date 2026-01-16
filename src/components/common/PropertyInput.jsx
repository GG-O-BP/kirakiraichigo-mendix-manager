import * as R from "ramda";
import { memo } from "react";

const extractEventValue = R.path(["target", "value"]);

const handleInputChange = R.curry((onChange, event) =>
  R.pipe(extractEventValue, onChange)(event),
);

const renderTextInput = R.curry((value, onChange, disabled) => (
  <input
    type="text"
    className="property-input"
    value={value}
    onChange={handleInputChange(onChange)}
    disabled={disabled}
  />
));

const renderTextarea = R.curry((value, onChange, disabled) => (
  <textarea
    className="property-textarea"
    rows="4"
    value={value}
    onChange={handleInputChange(onChange)}
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
    onChange={handleInputChange(onChange)}
    disabled={disabled}
  >
    {R.map(renderSelectOption, options)}
  </select>
));

const propertyTypeRenderers = {
  text: renderTextInput,
  textarea: renderTextarea,
  select: renderSelect,
};

const getRendererForType = R.propOr(R.always(null), R.__, propertyTypeRenderers);

const renderInputByType = R.curry((type, value, onChange, options, disabled) => {
  const renderer = getRendererForType(type);
  return type === "select"
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
