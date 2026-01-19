import * as R from "ramda";
import { memo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

const UNINSTALL_BUTTON_GRADIENT = {
  background: "linear-gradient(135deg, rgba(220, 20, 60, 0.2) 0%, rgba(220, 20, 60, 0.3) 100%)",
  borderColor: "rgba(220, 20, 60, 0.4)",
};

const INLINE_FLEX_GAP = { display: "flex", gap: "8px" };

const joinTruthyClassNames = R.pipe(R.filter(R.identity), R.join(" "));

export const invokeGetVersionValidityBadge = async (isValid, isLts, isMts) =>
  invoke("get_version_validity_badge", { isValid, isLts, isMts });

export const invokeFormatDateWithFallback = async (dateStr, fallback) =>
  invoke("format_date_with_fallback", { dateStr, fallback });

export const invokeGetVersionStatusText = async (isLaunching, isUninstalling, installDate) =>
  invoke("get_version_status_text", { isLaunching, isUninstalling, installDate });

const executeWithStoppedPropagation = R.curry((onClick, e) =>
  R.pipe(
    R.tap((e) => e.stopPropagation()),
    R.tap(() => onClick()),
    R.always(undefined),
  )(e),
);

const renderLaunchButton = R.curry(
  (onLaunch, version, isLaunching, isUninstalling) => (
    <button
      className="install-button"
      onClick={executeWithStoppedPropagation(() => onLaunch(version))}
      disabled={isLaunching || !version.is_valid || isUninstalling}
    >
      <span className="button-icon">▶️</span>
      {isLaunching ? "Launching..." : "Launch"}
    </button>
  ),
);

const renderUninstallButton = R.curry(
  (onUninstall, version, isUninstalling, isLaunching) => (
    <button
      className="install-button uninstall-button"
      onClick={executeWithStoppedPropagation(() => onUninstall(version))}
      disabled={isUninstalling || !version.is_valid || isLaunching}
      style={UNINSTALL_BUTTON_GRADIENT}
    >
      <span className="button-icon">🗑️</span>
      {isUninstalling ? "..." : ""}
    </button>
  ),
);

export const MendixVersionListItem = memo(
  ({
    version,
    onLaunch,
    onUninstall,
    isLaunching,
    isUninstalling,
    isSelected,
    onClick,
  }) => {
    const [statusText, setStatusText] = useState("Loading...");

    useEffect(() => {
      invokeGetVersionStatusText(isLaunching, isUninstalling, version.install_date)
        .then(setStatusText)
        .catch(() => setStatusText("Date unknown"));
    }, [isLaunching, isUninstalling, version.install_date]);

    const className = joinTruthyClassNames([
      "version-list-item",
      isSelected && "selected",
      isUninstalling && "disabled",
    ]);

    const containerProps = {
      className,
      onClick: isUninstalling ? undefined : onClick,
      style: { cursor: isUninstalling ? "not-allowed" : "pointer" },
    };

    return (
      <div {...containerProps}>
        <div className="version-info">
          <span className="version-icon">🚀</span>
          <div className="version-details">
            <span className="version-number">{version.version}</span>
            <span className="version-date">{statusText}</span>
          </div>
        </div>
        <div style={INLINE_FLEX_GAP}>
          {renderLaunchButton(onLaunch, version, isLaunching, isUninstalling)}
          {renderUninstallButton(
            onUninstall,
            version,
            isUninstalling,
            isLaunching,
          )}
        </div>
      </div>
    );
  },
);

MendixVersionListItem.displayName = "MendixVersionListItem";

const renderAppVersionBadge = R.curry((version) =>
  version ? (
    <span className="version-badge app-version">v{version}</span>
  ) : null,
);

export const MendixAppListItem = memo(({ app, isDisabled, onClick }) => {
  const [formattedDate, setFormattedDate] = useState("Loading...");

  useEffect(() => {
    invokeFormatDateWithFallback(app.last_modified, "Date unknown")
      .then(setFormattedDate)
      .catch(() => setFormattedDate("Date unknown"));
  }, [app.last_modified]);

  const className = joinTruthyClassNames([
    "version-list-item",
    isDisabled && "disabled",
  ]);

  const containerProps = {
    className,
    onClick: isDisabled ? undefined : onClick,
    style: {
      cursor: isDisabled ? "not-allowed" : "pointer",
      opacity: isDisabled ? 0.5 : 1,
    },
  };

  return (
    <div {...containerProps}>
      <div className="version-info">
        <span className="version-icon">📁</span>
        <div className="version-details">
          <span className="version-number">{app.name}</span>
          <span className="version-date">
            {renderAppVersionBadge(app.version)}
            {formattedDate}
          </span>
        </div>
      </div>
    </div>
  );
});

MendixAppListItem.displayName = "MendixAppListItem";
