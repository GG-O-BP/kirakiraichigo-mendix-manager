import * as R from "ramda";
import { memo } from "react";

// Extract value from event
const getEventValue = R.path(["target", "value"]);

// Create change handler
const createChangeHandler = R.curry((onChange, event) =>
  R.pipe(getEventValue, onChange)(event),
);

// Get option value
const getOptionValue = R.prop("value");

// Get option label
const getOptionLabel = R.prop("label");

// Render single option
const renderOption = (option) => (
  <option key={getOptionValue(option)} value={getOptionValue(option)}>
    {getOptionLabel(option)}
  </option>
);

// Render all options
const renderOptions = R.map(renderOption);

// Dropdown component with functional approach
const Dropdown = memo(({ value, onChange, options }) => (
  <div className="dropdown-container">
    <select
      className="dropdown"
      value={value}
      onChange={createChangeHandler(onChange)}
    >
      {renderOptions(options)}
    </select>
    <span className="dropdown-icon">🍓</span>
  </div>
));

Dropdown.displayName = "Dropdown";

export default Dropdown;
