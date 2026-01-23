import * as R from "ramda";
import { atom, onMount } from "nanostores";
import { createI18n, localeFrom, browser, formatter } from "@nanostores/i18n";
import { locale as getOsLocale } from "@tauri-apps/plugin-os";
import { STORAGE_KEYS } from "../utils/constants";
import { saveToStorage, loadFromStorage } from "../utils/storage";

export const SUPPORTED_LOCALES = ["en", "ko", "ja"];
export const DEFAULT_LOCALE = "en";

const storedLocale = atom(undefined);

onMount(storedLocale, () => {
  loadFromStorage(STORAGE_KEYS.LOCALE, null).then((saved) => {
    storedLocale.set(saved);
  });
});

const normalizeLocale = R.pipe(
  R.defaultTo(""),
  R.split(/[-_]/),
  R.head,
  R.toLower,
);

const isValidLocale = R.includes(R.__, SUPPORTED_LOCALES);

const detectLocale = async () => {
  try {
    const osLocale = await getOsLocale();
    const normalized = normalizeLocale(osLocale);
    return R.ifElse(isValidLocale, R.identity, R.always(DEFAULT_LOCALE))(normalized);
  } catch {
    const browserLocale = normalizeLocale(navigator.language);
    return R.ifElse(isValidLocale, R.identity, R.always(DEFAULT_LOCALE))(browserLocale);
  }
};

export const locale = localeFrom(
  storedLocale,
  browser({ available: SUPPORTED_LOCALES, fallback: DEFAULT_LOCALE }),
);

export const setLocale = async (newLocale) => {
  const validLocale = R.ifElse(isValidLocale, R.identity, R.always(DEFAULT_LOCALE))(newLocale);
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

export const i18n = createI18n(locale, {
  get(code) {
    return import(`./locales/${code}.json`).then((module) => module.default);
  },
});

export const format = formatter(locale);

export const messages = i18n("app", {
  tabs: {
    studioProManager: "Studio Pro Manager",
    widgetManager: "Widget Manager",
    widgetPreview: "Widget Preview",
  },
  common: {
    loading: "Loading~ Wait a tick!",
    search: "Let's find it~!",
    cancel: "Nope, cancel!",
    confirm: "Yep, confirmed!",
    delete: "Delete it!",
    install: "Install!",
    uninstall: "Uninstall",
    launch: "Launch!",
    launching: "Launching~ Whoosh!",
    download: "Download!",
    save: "Save!",
    close: "Close",
    refresh: "Refresh!",
    select: "Pick one~!",
    selectAll: "Select all!",
    deselectAll: "Deselect all!",
    noResults: "Huh? Nothing here!",
    error: "Oh no! Something's wrong!",
    success: "Ta-da~! Success! Hehe",
    warning: "Wait! Be careful~",
    pleaseWait: "Just a mo~ Almost done!",
    areYouSure: "Are you really really sure?",
    yes: "Yes!",
    no: "Nope!",
    dateUnknown: "Date unknown",
    installed: "Installed!",
  },
  header: {
    title: "Kirakira Ichigo Manager",
    language: "Language",
  },
  versions: {
    installed: "Installed Versions",
    downloadable: "Downloadable Versions",
    noVersionsFound: "No versions here~?",
    noInstalledVersions: "No installed versions yet!",
    noDownloadableVersions: "No downloadable versions!",
    searchInstalled: "Search installed versions~",
    searchDownloadable: "Search downloadable versions~",
    loadingMore: "Loading more~!",
    allLoaded: "All loaded up!",
    clickToLoadMore: "Click to load more~!",
    lts: "LTS",
    mts: "MTS",
    beta: "Beta",
  },
  apps: {
    installed: "Installed Apps",
    noAppsFound: "No apps here~?",
    searchApps: "Let's find an app~!",
    allVersions: "All Versions",
    openInExplorer: "Open in folder",
    deleteApp: "Delete app",
  },
  widgets: {
    title: "Widgets",
    noWidgetsFound: "Huh? No widgets!",
    noWidgetsRegistered: "No widgets registered yet!",
    noWidgetsMatching: "Can't find \"{term}\"~",
    addWidget: "Add widget!",
    addNewWidget: "Add a new widget",
    clickToAdd: "Click to add a widget~!",
    removeWidget: "Remove widget",
    selectWidget: "Pick a widget~!",
    searchWidgets: "Search widgets~",
    install: "Install ({count} widgets)",
    installing: "Installing~ Whoosh whoosh!",
    buildDeploy: "Build + Deploy ({widgetCount} widgets → {appCount} apps)",
    deployOnly: "Deploy Only ({widgetCount} widgets → {appCount} apps)",
    building: "Building~",
    deploying: "Deploying~",
    buildingAndDeploying: "Building and deploying! Yay!",
    packageManager: "Package Manager:",
  },
  preview: {
    title: "Widget Preview",
    selectWidget: "Pick a widget to preview~!",
    selectToViewProperties: "Pick a widget to see its properties!",
    properties: "Properties",
    noProperties: "No properties to set!",
    loadingProperties: "Loading properties~",
    general: "General",
    buildingWidget: "Building widget~",
    emptyState: "Pick a widget, click 🔨▶️~\nand watch the magic happen! Hehe",
    buildPreview: "Build Preview",
    runPreview: "Run Preview!",
  },
  modals: {
    download: {
      title: "Confirm Installation",
      installTitle: "Install Mendix Studio Pro {version}?",
      description: "I'll download and install Mendix Studio Pro {version}!",
      extracting: "Finding the build number~",
      settingUp: "Getting the download ready~",
      downloading: "Downloading~",
      launchingInstaller: "Starting the installer!",
      setupSuccess: "Setup file is running! Ta-da~",
      followWizard: "Just follow the wizard and you're done!",
      installFailed: "Oh no... Installation failed :((",
      startInstallation: "Start installation!",
      pleaseWait: "Please wait~ It might take a bit!",
    },
    widget: {
      title: "Add Widget!",
      chooseAction: "What shall we do~?",
    },
    confirm: {
      title: "Confirm",
      processing: "Working on it~",
      confirm: "Delete it!",
    },
    studioPro: {
      uninstallTitle: "Say bye-bye to Studio Pro?",
      uninstallMessage: "Are you really really sure you want to uninstall Studio Pro {version}?\n\nOnce it's gone, there's no going back! Think carefully, okay?",
      uninstallOnly: "Just uninstall",
      uninstallAndDeleteApps: "Uninstall + delete apps too",
    },
    widgetRemove: {
      title: "Remove from the list?",
      message: "Shall I remove \"{caption}\" from the widget list?\n\nDon't worry! The files stay safe~ Just removing from my list!",
    },
    appDelete: {
      title: "Delete this app?",
      message: "Really delete {name}?\n\nI can't undo this once it's done! Are you absolutely sure?",
      deleteFailed: "Oops, couldn't delete the app :(( {error}",
    },
  },
  errors: {
    generic: "Oh dear! Something went wrong!",
    network: "Network error!",
    notFound: "Can't find it!",
    launchFailed: "Launch failed :((",
    uninstallFailed: "Uninstall failed :((",
    downloadFailed: "Download failed :((",
    deleteFailed: "Delete failed :((",
  },
});
