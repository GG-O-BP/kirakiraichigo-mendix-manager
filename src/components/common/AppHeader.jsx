import * as R from "ramda";
import { useI18n, LOCALE_LABELS, LOCALE_FLAGS } from "../../i18n/useI18n";

function AppHeader({
  currentTheme,
  currentLogo,
  handleThemeChange,
  locale,
  setLocale,
  supportedLocales,
}) {
  const { t } = useI18n();

  const handleLocaleChange = R.pipe(R.path(["target", "value"]), setLocale);

  const getLocaleLabel = R.curry((code) =>
    R.pipe(
      R.prop(R.__, LOCALE_FLAGS),
      R.concat(R.__, " "),
      R.concat(R.__, R.propOr(code, code, LOCALE_LABELS)),
    )(code),
  );

  const renderLocaleOption = R.curry((currentLocale, code) => (
    <option key={code} value={code}>
      {getLocaleLabel(code)}
    </option>
  ));

  return (
    <div className="app-header">
      <h1 className="app-title">
        <span className="title-icon">🍓</span>
        {R.pathOr("Kirakira Ichigo Manager", ["header", "title"], t)}
        <span className="title-sparkle">✨</span>
      </h1>
      <div className="header-controls">
        <div className="language-selector">
          <select
            className="language-select"
            value={locale}
            onChange={handleLocaleChange}
          >
            {R.map(renderLocaleOption(locale), supportedLocales)}
          </select>
        </div>
        <div className="theme-selector">
          <div className="catppuccin-banner">
            <img
              src={currentLogo}
              alt="Catppuccin"
              className="catppuccin-logo"
            />
            <div className="catppuccin-info">
              <span className="catppuccin-attribution">
                {R.pathOr(
                  "Latte, Frappe, Macchiato, Mocha themes powered by",
                  ["header", "themeAttribution"],
                  t,
                )}
              </span>
              <a
                href="https://catppuccin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="catppuccin-link"
              >
                Catppuccin
              </a>
            </div>
          </div>
          <div className="theme-options">
            <label className="theme-option">
              <input
                type="radio"
                name="theme"
                value="kiraichi"
                checked={currentTheme === "kiraichi"}
                onChange={handleThemeChange}
              />
              <span>{R.pathOr("KiraIchi Dark", ["themes", "kiraIchiDark"], t)}</span>
            </label>
            <label className="theme-option strawberry-theme">
              <input
                type="radio"
                name="theme"
                value="kiraichi-light"
                checked={currentTheme === "kiraichi-light"}
                onChange={handleThemeChange}
              />
              <span>{R.pathOr("KiraIchi Light", ["themes", "kiraIchiLight"], t)}</span>
            </label>
            <label className="theme-option catppuccin-theme catppuccin-latte-theme">
              <input
                type="radio"
                name="theme"
                value="latte"
                checked={currentTheme === "latte"}
                onChange={handleThemeChange}
              />
              <span>{R.pathOr("Latte", ["themes", "latte"], t)}</span>
            </label>
            <label className="theme-option catppuccin-theme catppuccin-frappe-theme">
              <input
                type="radio"
                name="theme"
                value="frappe"
                checked={currentTheme === "frappe"}
                onChange={handleThemeChange}
              />
              <span>{R.pathOr("Frappe", ["themes", "frappe"], t)}</span>
            </label>
            <label className="theme-option catppuccin-theme catppuccin-macchiato-theme">
              <input
                type="radio"
                name="theme"
                value="macchiato"
                checked={currentTheme === "macchiato"}
                onChange={handleThemeChange}
              />
              <span>{R.pathOr("Macchiato", ["themes", "macchiato"], t)}</span>
            </label>
            <label className="theme-option catppuccin-theme catppuccin-mocha-theme">
              <input
                type="radio"
                name="theme"
                value="mocha"
                checked={currentTheme === "mocha"}
                onChange={handleThemeChange}
              />
              <span>{R.pathOr("Mocha", ["themes", "mocha"], t)}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppHeader;
