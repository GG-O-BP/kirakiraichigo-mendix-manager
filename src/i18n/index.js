import * as R from "ramda";
import { atom, onMount } from "nanostores";
import { createI18n, localeFrom, browser } from "@nanostores/i18n";
import { locale as getOsLocale } from "@tauri-apps/plugin-os";
import { STORAGE_KEYS } from "../utils/constants";
import { saveToStorage, loadFromStorage } from "../utils/storage";
import enMessages from "./locales/en.json";

export const SUPPORTED_LOCALES = ["en", "ko", "ja"];
const DEFAULT_LOCALE = "en";

const storedLocale = atom(undefined);

onMount(storedLocale, () => {
  R.andThen((saved) => storedLocale.set(saved), loadFromStorage(STORAGE_KEYS.LOCALE, null));
});

const normalizeLocale = R.pipe(
  R.defaultTo(""),
  R.split(/[-_]/),
  R.head,
  R.toLower,
);

const isValidLocale = R.includes(R.__, SUPPORTED_LOCALES);

const toValidLocale = R.ifElse(isValidLocale, R.identity, R.always(DEFAULT_LOCALE));

const detectLocale = () =>
  R.pipe(
    () => getOsLocale(),
    R.andThen(R.pipe(normalizeLocale, toValidLocale)),
    R.otherwise(() => R.pipe(normalizeLocale, toValidLocale)(navigator.language)),
  )();

export const locale = localeFrom(
  storedLocale,
  browser({ available: SUPPORTED_LOCALES, fallback: DEFAULT_LOCALE }),
);

export const setLocale = async (newLocale) => {
  const validLocale = toValidLocale(newLocale);
  storedLocale.set(validLocale);
  await saveToStorage(STORAGE_KEYS.LOCALE, validLocale);
};

export const initializeLocale = async () => {
  const saved = await loadFromStorage(STORAGE_KEYS.LOCALE, null);
  const localeToUse = R.ifElse(R.isNil, detectLocale, R.identity)(saved);
  const finalLocale = await localeToUse;
  storedLocale.set(finalLocale);
  return finalLocale;
};

const localeLoaders = {
  ko: () => import("./locales/ko.json"),
  ja: () => import("./locales/ja.json"),
};

const fallbackLoader = R.always(Promise.resolve({ default: enMessages }));

const i18n = createI18n(locale, {
  get: (code) =>
    R.andThen(R.prop("default"), R.propOr(fallbackLoader, code, localeLoaders)()),
});

export const messages = i18n("app", enMessages.app);
