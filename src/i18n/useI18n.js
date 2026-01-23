import * as R from "ramda";
import { useStore } from "@nanostores/react";
import { locale, setLocale, messages, SUPPORTED_LOCALES, initializeLocale } from "./index";

const replaceParams = R.curry((params, str) =>
  R.reduce(
    (acc, [key, value]) => R.replace(new RegExp(`\\{${key}\\}`, "g"), String(value), acc),
    str,
    R.toPairs(params),
  ),
);

export function useI18n() {
  const currentLocale = useStore(locale);
  const t = useStore(messages);

  const tp = R.curry((key, params) =>
    R.pipe(R.path(R.split(".", key)), R.ifElse(R.isNil, R.always(key), replaceParams(params)))(t),
  );

  const getNestedValue = R.curry((key) =>
    R.pipe(R.split("."), R.path(R.__, t), R.defaultTo(key))(key),
  );

  return {
    t,
    tp,
    get: getNestedValue,
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
