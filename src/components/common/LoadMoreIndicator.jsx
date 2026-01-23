import * as R from "ramda";
import { memo } from "react";

const LoadingState = memo(({ t }) => (
  <div key="loading-more" className="loading-indicator">
    <span className="loading-icon">🍓</span>
    <p>{R.pathOr("Loading more versions...", ["versions", "loadingMore"], t)}</p>
  </div>
));

LoadingState.displayName = "LoadingState";

const EndOfListState = memo(({ t }) => (
  <div
    key="end-of-list"
    className="end-indicator"
    style={{ cursor: "default" }}
  >
    <p>{R.pathOr("All versions loaded", ["versions", "allLoaded"], t)}</p>
  </div>
));

EndOfListState.displayName = "EndOfListState";

const LoadMoreButton = memo(({ onClick, t }) => (
  <div key="load-more" className="end-indicator" onClick={onClick}>
    <p>{R.pathOr("Click to load more versions", ["versions", "clickToLoadMore"], t)}</p>
  </div>
));

LoadMoreButton.displayName = "LoadMoreButton";

const LoadMoreIndicator = memo(({ fetchFunction, isLoading, totalCount, t }) => {
  if (isLoading) {
    return <LoadingState t={t} />;
  }

  const isInitialLoadOrEmpty = !fetchFunction && totalCount === 0;
  if (isInitialLoadOrEmpty) {
    return null;
  }

  if (!fetchFunction) {
    return <EndOfListState t={t} />;
  }

  return <LoadMoreButton onClick={fetchFunction} t={t} />;
});

LoadMoreIndicator.displayName = "LoadMoreIndicator";

export const renderLoadMoreIndicator = R.curry((fetchFunction, isLoading, totalCount, t) => (
  <LoadMoreIndicator
    key="load-more-indicator"
    fetchFunction={fetchFunction}
    isLoading={isLoading}
    totalCount={totalCount}
    t={t}
  />
));

export default LoadMoreIndicator;
