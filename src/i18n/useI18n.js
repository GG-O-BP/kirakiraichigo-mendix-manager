import { useStore } from "@nanostores/react";
import { locale, setLocale, messages, SUPPORTED_LOCALES, initializeLocale } from "./index";

export function useI18n() {
  const currentLocale = useStore(locale);
  const t = useStore(messages);

  return {
    t,
    locale: currentLocale,
    setLocale,
    initializeLocale,
    supportedLocales: SUPPORTED_LOCALES,
  };
}

export const LOCALE_LABELS = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
};

export const LOCALE_FLAGS = {
  en: "\u{1F1FA}\u{1F1F8}",
  ko: "\u{1F1F0}\u{1F1F7}",
  ja: "\u{1F1EF}\u{1F1F5}",
};
