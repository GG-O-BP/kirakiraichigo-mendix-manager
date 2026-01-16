import * as R from "ramda";

// Render panel with search controls and content area
export const renderPanel = R.curry((config) => (
  <div key={config.key} className={config.className}>
    {config.searchControls}
    <div className="list-area">{config.content}</div>
  </div>
));

export default renderPanel;
