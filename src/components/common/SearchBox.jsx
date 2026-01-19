import { memo } from "react";
import { createChangeHandler } from "../../utils";

// SearchBox component with functional approach
const SearchBox = memo(({ placeholder, value, onChange }) => (
  <div className="search-container">
    <span className="search-icon">🔍</span>
    <input
      type="text"
      className="search-box"
      placeholder={placeholder}
      value={value}
      onChange={createChangeHandler(onChange)}
    />
  </div>
));

SearchBox.displayName = "SearchBox";

export default SearchBox;
