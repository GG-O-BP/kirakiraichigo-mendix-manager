import { useState, useCallback, useEffect } from "react";
import { flavors } from "@catppuccin/palette";
import catppuccinLogo from "../assets/catppuccin_circle.png";
import catppuccinLatteLogo from "../assets/catppuccin_latte_circle.png";
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from "../utils/functional";

const THEME_CLASSES = [
  "theme-kiraichi",
  "theme-kiraichi-light",
  "theme-latte",
  "theme-frappe",
  "theme-macchiato",
  "theme-mocha",
];

const CATPPUCCIN_CSS_VARS = [
  "rosewater",
  "flamingo",
  "pink",
  "mauve",
  "red",
  "maroon",
  "peach",
  "yellow",
  "green",
  "teal",
  "sky",
  "sapphire",
  "blue",
  "lavender",
  "text",
  "subtext1",
  "subtext0",
  "overlay2",
  "overlay1",
  "overlay0",
  "surface2",
  "surface1",
  "surface0",
  "base",
  "mantle",
  "crust",
];

const applyTheme = (themeName) => {
  const root = document.documentElement;

  root.classList.remove(...THEME_CLASSES);
  root.classList.add(`theme-${themeName}`);

  if (themeName !== "kiraichi" && themeName !== "kiraichi-light") {
    const flavor = flavors[themeName];

    if (flavor) {
      CATPPUCCIN_CSS_VARS.forEach((colorName) => {
        root.style.setProperty(
          `--catppuccin-${colorName}`,
          flavor.colors[colorName].hex,
        );
      });
    }
  }
};

const isLightTheme = (theme) => ["latte", "kiraichi-light"].includes(theme);

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState("kiraichi");

  const currentLogo = isLightTheme(currentTheme)
    ? catppuccinLatteLogo
    : catppuccinLogo;

  const handleThemeChange = useCallback((event) => {
    const newTheme = event.target.value;
    setCurrentTheme(newTheme);
    saveToStorage(STORAGE_KEYS.THEME, newTheme).catch(console.error);
    applyTheme(newTheme);
  }, []);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await loadFromStorage(STORAGE_KEYS.THEME, "kiraichi");
        setCurrentTheme(savedTheme);
        applyTheme(savedTheme);
      } catch (error) {
        console.error("Failed to load theme:", error);
      }
    };
    loadSavedTheme();
  }, []);

  return {
    currentTheme,
    currentLogo,
    handleThemeChange,
  };
}

export default useTheme;
