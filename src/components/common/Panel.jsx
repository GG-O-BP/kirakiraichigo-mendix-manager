import * as R from "ramda";

export const renderPanel = R.curry((config) => (
  <div key={config.key} className={config.className}>
    {config.searchControls}
    <div className="list-area">{config.content}</div>
  </div>
));
