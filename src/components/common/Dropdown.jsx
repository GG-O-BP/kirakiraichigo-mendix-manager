import * as R from "ramda";
import { memo } from "react";
import { createChangeHandler } from "../../utils";

const isObjectOption = R.both(R.is(Object), R.has("value"));

const extractOptionValue = R.ifElse(isObjectOption, R.prop("value"), R.identity);

const extractOptionLabel = R.ifElse(isObjectOption, R.prop("label"), R.identity);

const Option = (option) => (
  <option key={extractOptionValue(option)} value={extractOptionValue(option)}>
    {extractOptionLabel(option)}
  </option>
);

const Dropdown = memo(({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = null,
  className = "",
}) => (
  <div className="dropdown-container">
    <select
      className={R.join(" ", R.filter(R.identity, ["dropdown", className]))}
      value={value}
      onChange={createChangeHandler(onChange)}
      disabled={disabled}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {R.map(Option, options)}
    </select>
    <span className="dropdown-icon">🍓</span>
  </div>
));

Dropdown.displayName = "Dropdown";

export default Dropdown;
