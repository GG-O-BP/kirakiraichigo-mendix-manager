import * as R from "ramda";
import { memo } from "react";

const InlineResultItem = memo(({ type, widget, apps }) => (
  <div className={`inline-result-item ${type}`}>
    <span className="result-icon">{R.equals(type, "success") ? "✅" : "❌"}</span>
    <span className="result-text">{widget}</span>
    {R.ifElse(
      R.both(R.always(R.equals(type, "success")), R.complement(R.isNil)),
      R.always(
        <span className="result-details">
          → {R.join(", ", R.defaultTo([], apps))}
        </span>,
      ),
      R.always(null),
    )(apps)}
  </div>
));

InlineResultItem.displayName = "InlineResultItem";

const InlineResults = memo(({ inlineResults, setInlineResults }) => {
  const hasResults = R.pipe(
    R.juxt([
      R.pipe(R.propOr([], "successful"), R.complement(R.isEmpty)),
      R.pipe(R.propOr([], "failed"), R.complement(R.isEmpty)),
    ]),
    R.any(R.identity),
  )(inlineResults);

  if (R.or(R.isNil(inlineResults), R.not(hasResults))) {
    return null;
  }

  const successfulResults = R.propOr([], "successful", inlineResults);
  const failedResults = R.propOr([], "failed", inlineResults);

  return (
    <div className="inline-results-container">
      <div className="inline-results-header">
        <h4>Build & Deploy Results</h4>
        <button
          className="clear-results-button"
          onClick={() => setInlineResults(null)}
        >
          Clear
        </button>
      </div>
      <div className="inline-results-content">
        {R.addIndex(R.map)(
          (result, index) => (
            <InlineResultItem
              key={`success-${index}`}
              type="success"
              widget={R.prop("widget", result)}
              apps={R.prop("apps", result)}
            />
          ),
          successfulResults,
        )}
        {R.addIndex(R.map)(
          (result, index) => (
            <InlineResultItem
              key={`failed-${index}`}
              type="failed"
              widget={R.prop("widget", result)}
            />
          ),
          failedResults,
        )}
      </div>
    </div>
  );
});

InlineResults.displayName = "InlineResults";

export default InlineResults;
