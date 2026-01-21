function AppHeader({ currentTheme, currentLogo, handleThemeChange }) {
  return (
    <div className="app-header">
      <h1 className="app-title">
        <span className="title-icon">🍓</span>
        Kirakira Ichigo Manager
        <span className="title-sparkle">✨</span>
      </h1>
      <div className="theme-selector">
        <div className="catppuccin-banner">
          <img
            src={currentLogo}
            alt="Catppuccin"
            className="catppuccin-logo"
          />
          <div className="catppuccin-info">
            <span className="catppuccin-attribution">
              Latte, Frappé, Macchiato, Mocha themes powered by
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
            <span>KiraIchi Dark</span>
          </label>
          <label className="theme-option strawberry-theme">
            <input
              type="radio"
              name="theme"
              value="kiraichi-light"
              checked={currentTheme === "kiraichi-light"}
              onChange={handleThemeChange}
            />
            <span>KiraIchi Light</span>
          </label>
          <label className="theme-option catppuccin-theme catppuccin-latte-theme">
            <input
              type="radio"
              name="theme"
              value="latte"
              checked={currentTheme === "latte"}
              onChange={handleThemeChange}
            />
            <span>Latte</span>
          </label>
          <label className="theme-option catppuccin-theme catppuccin-frappe-theme">
            <input
              type="radio"
              name="theme"
              value="frappe"
              checked={currentTheme === "frappe"}
              onChange={handleThemeChange}
            />
            <span>Frappé</span>
          </label>
          <label className="theme-option catppuccin-theme catppuccin-macchiato-theme">
            <input
              type="radio"
              name="theme"
              value="macchiato"
              checked={currentTheme === "macchiato"}
              onChange={handleThemeChange}
            />
            <span>Macchiato</span>
          </label>
          <label className="theme-option catppuccin-theme catppuccin-mocha-theme">
            <input
              type="radio"
              name="theme"
              value="mocha"
              checked={currentTheme === "mocha"}
              onChange={handleThemeChange}
            />
            <span>Mocha</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default AppHeader;
