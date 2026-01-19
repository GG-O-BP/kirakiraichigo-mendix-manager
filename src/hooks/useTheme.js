import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import { flavors } from "@catppuccin/palette";
import catppuccinLogo from "../assets/catppuccin_circle.png";
import catppuccinLatteLogo from "../assets/catppuccin_latte_circle.png";
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from "../utils";

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

const CUSTOM_THEMES = ["kiraichi", "kiraichi-light"];
const LIGHT_THEMES = ["latte", "kiraichi-light"];

const isCustomTheme = R.includes(R.__, CUSTOM_THEMES);
const isLightTheme = R.includes(R.__, LIGHT_THEMES);

const applyCatppuccinColors = R.curry((root, flavor) => {
  R.forEach((colorName) => {
    root.style.setProperty(
      `--catppuccin-${colorName}`,
      R.path(["colors", colorName, "hex"], flavor),
    );
  }, CATPPUCCIN_CSS_VARS);
});

const applyTheme = (themeName) => {
  const root = document.documentElement;

  root.classList.remove(...THEME_CLASSES);
  root.classList.add(`theme-${themeName}`);

  R.unless(
    R.always(isCustomTheme(themeName)),
    () => {
      const flavor = R.prop(themeName, flavors);
      R.when(R.complement(R.isNil), applyCatppuccinColors(root))(flavor);
    },
  )();
};

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState("kiraichi");

  const currentLogo = R.ifElse(
    isLightTheme,
    R.always(catppuccinLatteLogo),
    R.always(catppuccinLogo),
  )(currentTheme);

  const handleThemeChange = useCallback(
    R.pipe(
      R.path(["target", "value"]),
      R.tap(setCurrentTheme),
      R.tap((newTheme) => saveToStorage(STORAGE_KEYS.THEME, newTheme).catch(console.error)),
      R.tap(applyTheme),
    ),
    [],
  );

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
