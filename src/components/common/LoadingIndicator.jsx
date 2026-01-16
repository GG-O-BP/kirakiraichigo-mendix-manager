import * as R from "ramda";

// Render loading/empty state indicator
export const renderLoadingIndicator = R.curry((icon, message) => (
  <div className="loading-indicator">
    <span className="loading-icon">{icon}</span>
    <span>{message}</span>
  </div>
));

export default renderLoadingIndicator;
