import * as R from "ramda";
import { memo } from "react";

// Extract value from event
const getEventValue = R.path(["target", "value"]);

// Create change handler
const createChangeHandler = R.curry((onChange, event) =>
  R.pipe(getEventValue, onChange)(event),
);

// Render text input
const renderTextInput = R.curry((value, onChange) => (
  <input
    type="text"
    className="property-input"
    value={value}
    onChange={createChangeHandler(onChange)}
  />
));

// Render textarea
const renderTextarea = R.curry((value, onChange) => (
  <textarea
    className="property-textarea"
    rows="4"
    value={value}
    onChange={createChangeHandler(onChange)}
  />
));

// Render single option
const renderOption = (option) => (
  <option key={option} value={option}>
    {option}
  </option>
);

// Render select input
const renderSelect = R.curry((value, onChange, options) => (
  <select
    className="property-select"
    value={value}
    onChange={createChangeHandler(onChange)}
  >
    {R.map(renderOption, options)}
  </select>
));

// Input type renderers map
const inputRenderers = {
  text: renderTextInput,
  textarea: renderTextarea,
  select: renderSelect,
};

// Get input renderer by type
const getInputRenderer = R.propOr(R.always(null), R.__, inputRenderers);

// Render input based on type
const renderInput = R.curry((type, value, onChange, options) => {
  const renderer = getInputRenderer(type);
  return type === "select"
    ? renderer(value, onChange, options)
    : renderer(value, onChange);
});

// PropertyInput component with functional approach
const PropertyInput = memo(({ label, type, value, onChange, options = [] }) => (
  <label className="property-label">
    <span className="label-text">{label}</span>
    {renderInput(type, value, onChange, options)}
  </label>
));

PropertyInput.displayName = "PropertyInput";

export default PropertyInput;
