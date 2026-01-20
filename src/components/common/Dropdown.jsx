import * as R from "ramda";
import { memo } from "react";
import { createChangeHandler } from "../../utils";

const extractOptionValue = R.prop("value");
const extractOptionLabel = R.prop("label");

const Option = (option) => (
  <option key={extractOptionValue(option)} value={extractOptionValue(option)}>
    {extractOptionLabel(option)}
  </option>
);

const Dropdown = memo(({ value, onChange, options }) => (
  <div className="dropdown-container">
    <select
      className="dropdown"
      value={value}
      onChange={createChangeHandler(onChange)}
    >
      {R.map(Option, options)}
    </select>
    <span className="dropdown-icon">🍓</span>
  </div>
));

Dropdown.displayName = "Dropdown";

export default Dropdown;
