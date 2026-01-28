import * as R from "ramda";
import { useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";
import { flavors } from "@catppuccin/palette";
import catppuccinLogo from "../assets/catppuccin_circle.png";
import catppuccinLatteLogo from "../assets/catppuccin_latte_circle.png";
import { SWR_KEYS } from "../lib/swr";
import { currentThemeAtom } from "../atoms/theme";

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

const fetchThemeMetadata = async (key) => {
  const themeName = key[1];
  try {
    return await invoke("get_theme_metadata", { themeName });
  } catch (error) {
    console.error("Failed to load theme metadata:", error);
    return { isLight: false, isCustom: true };
  }
};

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useAtom(currentThemeAtom);

  const { data: themeMetadata = { isLight: false, isCustom: true } } = useSWR(
    SWR_KEYS.THEME_METADATA(currentTheme),
    fetchThemeMetadata,
  );

  const currentLogo = R.ifElse(
    R.prop("isLight"),
    R.always(catppuccinLatteLogo),
    R.always(catppuccinLogo),
  )(themeMetadata);

  const handleThemeChange = useCallback(
    async (event) => {
      const newTheme = R.path(["target", "value"], event);
      setCurrentTheme(newTheme);
      await applyTheme(newTheme);
    },
    [setCurrentTheme],
  );

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  return {
    currentTheme,
    currentLogo,
    handleThemeChange,
    themeMetadata,
  };
}
