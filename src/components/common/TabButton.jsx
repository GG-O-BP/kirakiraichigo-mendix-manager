import * as R from "ramda";
import { memo } from "react";

// Build class name based on active state
const buildClassName = R.ifElse(
  R.identity,
  R.always("tab active"),
  R.always("tab"),
);

// Render sparkle if active
const renderSparkle = R.ifElse(
  R.identity,
  R.always(<span className="tab-sparkle"></span>),
  R.always(null),
);

// TabButton component with functional approach
const TabButton = memo(({ label, isActive, onClick }) => (
  <button className={buildClassName(isActive)} onClick={onClick}>
    <span className="tab-icon">🍓</span>
    {label}
    {renderSparkle(isActive)}
  </button>
));

TabButton.displayName = "TabButton";

export default TabButton;
