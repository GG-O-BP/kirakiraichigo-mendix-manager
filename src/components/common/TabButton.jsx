import * as R from "ramda";
import { memo } from "react";

const getActiveClassName = R.ifElse(
  R.identity,
  R.always("tab active"),
  R.always("tab"),
);

const ActiveSparkle = R.ifElse(
  R.identity,
  R.always(<span className="tab-sparkle"></span>),
  R.always(null),
);

const TabButton = memo(({ label, isActive, onClick }) => (
  <button className={getActiveClassName(isActive)} onClick={onClick}>
    <span className="tab-icon">🍓</span>
    {label}
    {ActiveSparkle(isActive)}
  </button>
));

TabButton.displayName = "TabButton";

export default TabButton;
