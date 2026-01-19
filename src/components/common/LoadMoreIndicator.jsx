import * as R from "ramda";
import { memo } from "react";

const LoadingState = memo(() => (
  <div key="loading-more" className="loading-indicator">
    <span className="loading-icon">🍓</span>
    <p>Loading more versions...</p>
  </div>
));

LoadingState.displayName = "LoadingState";

const EndOfListState = memo(() => (
  <div
    key="end-of-list"
    className="end-indicator"
    style={{ cursor: "default" }}
  >
    <p>All versions loaded</p>
  </div>
));

EndOfListState.displayName = "EndOfListState";

const LoadMoreButton = memo(({ onClick }) => (
  <div key="load-more" className="end-indicator" onClick={onClick}>
    <p>Click to load more versions</p>
  </div>
));

LoadMoreButton.displayName = "LoadMoreButton";

const LoadMoreIndicator = memo(({ fetchFunction, isLoading, totalCount }) => {
  if (isLoading) {
    return <LoadingState />;
  }

  const isInitialLoadOrEmpty = !fetchFunction && totalCount === 0;
  if (isInitialLoadOrEmpty) {
    return null;
  }

  if (!fetchFunction) {
    return <EndOfListState />;
  }

  return <LoadMoreButton onClick={fetchFunction} />;
});

LoadMoreIndicator.displayName = "LoadMoreIndicator";

export const renderLoadMoreIndicator = R.curry((fetchFunction, isLoading, totalCount) => (
  <LoadMoreIndicator
    fetchFunction={fetchFunction}
    isLoading={isLoading}
    totalCount={totalCount}
  />
));

export default LoadMoreIndicator;
