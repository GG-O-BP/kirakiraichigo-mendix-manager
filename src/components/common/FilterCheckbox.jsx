import * as R from "ramda";
import { memo } from "react";

const FilterCheckbox = memo(({ checked, onChange, label }) => (
  <label className="checkbox-label">
    <input
      type="checkbox"
      className="checkbox-input"
      checked={checked}
      onChange={onChange}
    />
    <span className="checkbox-text">{label}</span>
  </label>
));

FilterCheckbox.displayName = "FilterCheckbox";

export const renderFilterCheckbox = R.curry((checked, onChange, label) => (
  <FilterCheckbox checked={checked} onChange={onChange} label={label} />
));

export default FilterCheckbox;
