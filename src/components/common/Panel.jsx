import * as R from "ramda";

export const renderPanel = R.curry(({ key, className, searchControls, content }) => (
  <div key={key} className={className}>
    {searchControls}
    <div className="list-area">{content}</div>
  </div>
));
