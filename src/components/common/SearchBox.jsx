import * as R from "ramda";
import { memo } from "react";

// Extract value from event
const getEventValue = R.path(["target", "value"]);

// Create change handler
const createChangeHandler = R.curry((onChange, event) =>
  R.pipe(getEventValue, onChange)(event),
);

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
    <span className="sparkle">✨</span>
  </div>
));

SearchBox.displayName = "SearchBox";

export default SearchBox;
