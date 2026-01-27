import * as R from "ramda";
import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
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

const applyCatppuccinColors = R.curry((root, flavor) => {
  R.forEach((colorName) => {
    root.style.setProperty(
      `--catppuccin-${colorName}`,
      R.path(["colors", colorName, "hex"], flavor),
    );
  }, CATPPUCCIN_CSS_VARS);
});

const applyTheme = async (themeName) => {
  const root = document.documentElement;

  root.classList.remove(...THEME_CLASSES);
  root.classList.add(`theme-${themeName}`);

  try {
    const metadata = await invoke("get_theme_metadata", { themeName });

    R.unless(
      R.always(metadata.isCustom),
      () => {
        const flavor = R.prop(themeName, flavors);
        R.when(R.complement(R.isNil), applyCatppuccinColors(root))(flavor);
      },
    )();
  } catch (error) {
    console.error("Failed to get theme metadata:", error);
    const flavor = R.prop(themeName, flavors);
    R.when(R.complement(R.isNil), applyCatppuccinColors(root))(flavor);
  }
};

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState("kiraichi");
  const [themeMetadata, setThemeMetadata] = useState({ isLight: false, isCustom: true });

  useEffect(() => {
    const loadThemeMetadata = async () => {
      try {
        const metadata = await invoke("get_theme_metadata", { themeName: currentTheme });
        setThemeMetadata(metadata);
      } catch (error) {
        console.error("Failed to load theme metadata:", error);
      }
    };
    loadThemeMetadata();
  }, [currentTheme]);

  const currentLogo = R.ifElse(
    R.prop("isLight"),
    R.always(catppuccinLatteLogo),
    R.always(catppuccinLogo),
  )(themeMetadata);

  const handleThemeChange = useCallback(
    async (event) => {
      const newTheme = R.path(["target", "value"], event);
      setCurrentTheme(newTheme);
      await saveToStorage(STORAGE_KEYS.THEME, newTheme).catch(console.error);
      await applyTheme(newTheme);
    },
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
        await applyTheme(savedTheme);
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
    themeMetadata,
  };
}
