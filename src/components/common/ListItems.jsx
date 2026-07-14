import * as R from "ramda";
import { memo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../../i18n/useI18n";

const UNINSTALL_BUTTON_GRADIENT = {
  background: "linear-gradient(135deg, rgba(220, 20, 60, 0.2) 0%, rgba(220, 20, 60, 0.3) 100%)",
  borderColor: "rgba(220, 20, 60, 0.4)",
};

const INLINE_FLEX_GAP = { display: "flex", gap: "8px" };

const joinTruthyClassNames = R.pipe(R.filter(R.identity), R.join(" "));

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
  (onLaunch, version, isLaunching, isUninstalling, t) => (
    <button
      className="install-button"
      onClick={executeWithStoppedPropagation(() => onLaunch(version))}
      disabled={R.or(
        R.or(isLaunching, R.not(R.prop("is_valid", version))),
        isUninstalling,
      )}
    >
      <span className="button-icon">▶️</span>
      {R.ifElse(
        R.identity,
        R.always(R.pathOr("Launching...", ["common", "launching"], t)),
        R.always(R.pathOr("Launch", ["common", "launch"], t)),
      )(isLaunching)}
    </button>
  ),
);

const renderUninstallButton = R.curry(
  (onUninstall, version, isUninstalling, isLaunching) => (
    <button
      className="install-button uninstall-button"
      onClick={executeWithStoppedPropagation(() => onUninstall(version))}
      disabled={R.or(
        R.or(isUninstalling, R.not(R.prop("is_valid", version))),
        isLaunching,
      )}
      style={UNINSTALL_BUTTON_GRADIENT}
    >
      <span className="button-icon">🗑️</span>
      {R.ifElse(R.identity, R.always("..."), R.always(""))(isUninstalling)}
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
    const { t } = useI18n();
    const [statusText, setStatusText] = useState(R.pathOr("Loading...", ["common", "loading"], t));

    useEffect(() => {
      R.pipe(
        () => invokeGetVersionStatusText(isLaunching, isUninstalling, R.prop("install_date", version)),
        R.andThen(setStatusText),
        R.otherwise(() => setStatusText(R.pathOr("Date unknown", ["common", "dateUnknown"], t))),
      )();
    }, [isLaunching, isUninstalling, R.prop("install_date", version), t]);

    const className = joinTruthyClassNames([
      "version-list-item",
      R.and(isSelected, "selected"),
      R.and(isUninstalling, "disabled"),
    ]);

    const containerProps = {
      className,
      onClick: R.ifElse(R.identity, R.always(undefined), R.always(onClick))(isUninstalling),
      style: {
        cursor: R.ifElse(R.identity, R.always("not-allowed"), R.always("pointer"))(isUninstalling),
      },
    };

    return (
      <div {...containerProps}>
        <div className="version-info">
          <span className="version-icon">🚀</span>
          <div className="version-details">
            <span className="version-number">{R.prop("version", version)}</span>
            <span className="version-date">{statusText}</span>
          </div>
        </div>
        <div style={INLINE_FLEX_GAP}>
          {renderLaunchButton(onLaunch, version, isLaunching, isUninstalling, t)}
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

const renderAppVersionBadge = (version) =>
  R.ifElse(
    R.either(R.isNil, R.isEmpty),
    R.always(null),
    (versionLabel) => (
      <span className="version-badge app-version">v{versionLabel}</span>
    ),
  )(version);

const renderAppDeleteButton = R.curry((onDelete, app, isDisabled, t) => (
  <button
    className="install-button uninstall-button"
    onClick={executeWithStoppedPropagation(() => onDelete(app))}
    disabled={isDisabled}
    style={UNINSTALL_BUTTON_GRADIENT}
    title={R.pathOr("Delete app", ["apps", "deleteApp"], t)}
  >
    <span className="button-icon">🗑️</span>
  </button>
));

export const MendixAppListItem = memo(({ app, isDisabled, onClick, onDelete }) => {
  const { t } = useI18n();
  const [formattedDate, setFormattedDate] = useState(R.pathOr("Loading...", ["common", "loading"], t));

  useEffect(() => {
    R.pipe(
      () => invokeFormatDateWithFallback(R.prop("last_modified", app), R.pathOr("Date unknown", ["common", "dateUnknown"], t)),
      R.andThen(setFormattedDate),
      R.otherwise(() => setFormattedDate(R.pathOr("Date unknown", ["common", "dateUnknown"], t))),
    )();
  }, [R.prop("last_modified", app), t]);

  const className = joinTruthyClassNames([
    "version-list-item",
    R.and(isDisabled, "disabled"),
  ]);

  const containerProps = {
    className,
    onClick: R.ifElse(R.identity, R.always(undefined), R.always(onClick))(isDisabled),
    style: {
      cursor: R.ifElse(R.identity, R.always("not-allowed"), R.always("pointer"))(isDisabled),
      opacity: R.ifElse(R.identity, R.always(0.5), R.always(1))(isDisabled),
    },
  };

  return (
    <div {...containerProps}>
      <div className="version-info">
        <span className="version-icon">📁</span>
        <div className="version-details">
          <span className="version-number">{R.prop("name", app)}</span>
          <span className="version-date">
            {renderAppVersionBadge(R.prop("version", app))}
            {formattedDate}
          </span>
        </div>
      </div>
      {R.ifElse(
        R.isNotNil,
        () => (
          <div style={INLINE_FLEX_GAP}>
            {renderAppDeleteButton(onDelete, app, isDisabled, t)}
          </div>
        ),
        R.always(null),
      )(onDelete)}
    </div>
  );
});

MendixAppListItem.displayName = "MendixAppListItem";
