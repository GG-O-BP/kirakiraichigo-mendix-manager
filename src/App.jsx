import * as R from "ramda";
import React, { useState, useMemo, useEffect } from "react";
import { Provider as JotaiProvider } from "jotai";
import { SWRConfig, swrConfig } from "./lib/swr";
import "./styles/index.css";

import { TabButton, AppHeader } from "./components/common";
import { StudioProManager, WidgetManager, WidgetPreview } from "./components/tabs";
import { AppModals } from "./components/modals";

import { useAppInitialization, useContextValues } from "./hooks";
import { useI18n } from "./i18n/useI18n";
import { initializeLocale } from "./i18n";
import {
  AppProvider,
  WidgetCollectionProvider,
  WidgetPreviewProvider,
  WidgetFormProvider,
  BuildDeployProvider,
  VersionsProvider,
} from "./contexts";

const TAB_KEYS = ["studio-pro", "widget-manager", "widget-preview"];
const TAB_COMPONENTS = [StudioProManager, WidgetManager, WidgetPreview];
const TAB_LABEL_KEYS = ["studioProManager", "widgetManager", "widgetPreview"];

function App() {
  const { theme, versions, appsHook, widgetsHook, widgetPreviewHook, buildDeploy } =
    useAppInitialization();
  const { t, locale, setLocale, supportedLocales } = useI18n();

  useEffect(() => {
    initializeLocale();
  }, []);

  const {
    appContextValue,
    widgetCollectionContextValue,
    widgetPreviewContextValue,
    widgetFormContextValue,
    buildDeployContextValue,
    versionsContextValue,
  } = useContextValues({ appsHook, widgetsHook, widgetPreviewHook, buildDeploy, versions });

  const [activeTab, setActiveTab] = useState("studio-pro");

  const createTabFromIndex = R.curry((index) => ({
    id: R.nth(index, TAB_KEYS),
    labelKey: R.nth(index, TAB_LABEL_KEYS),
    component: React.createElement(R.nth(index, TAB_COMPONENTS)),
  }));

  const tabs = useMemo(
    () => R.map(createTabFromIndex, R.range(0, R.length(TAB_KEYS))),
    [],
  );

  const activeTabContent = useMemo(
    () =>
      R.pipe(
        R.find(R.propEq(activeTab, "id")),
        R.ifElse(R.isNil, R.always(null), R.prop("component")),
      )(tabs),
    [tabs, activeTab],
  );

  const getTabLabel = R.curry((t, labelKey) =>
    R.pathOr(labelKey, ["tabs", labelKey], t),
  );

  const renderTabButton = R.curry((activeTab, setActiveTab, t, tab) => (
    <TabButton
      key={R.prop("id", tab)}
      label={getTabLabel(t, R.prop("labelKey", tab))}
      isActive={R.equals(activeTab, R.prop("id", tab))}
      onClick={() => setActiveTab(R.prop("id", tab))}
    />
  ));

  return (
    <JotaiProvider>
      <SWRConfig value={swrConfig}>
        <VersionsProvider value={versionsContextValue}>
          <AppProvider value={appContextValue}>
            <WidgetCollectionProvider value={widgetCollectionContextValue}>
              <WidgetPreviewProvider value={widgetPreviewContextValue}>
                <WidgetFormProvider value={widgetFormContextValue}>
                  <BuildDeployProvider value={buildDeployContextValue}>
                    <main className="app-container">
                      <AppHeader
                        currentTheme={theme.currentTheme}
                        currentLogo={theme.currentLogo}
                        handleThemeChange={theme.handleThemeChange}
                        locale={locale}
                        setLocale={setLocale}
                        supportedLocales={supportedLocales}
                      />

                      <div className="tabs">
                        {R.map(renderTabButton(activeTab, setActiveTab, t), tabs)}
                      </div>

                      <div className="tab-content">{activeTabContent}</div>

                      <AppModals />
                    </main>
                  </BuildDeployProvider>
                </WidgetFormProvider>
              </WidgetPreviewProvider>
            </WidgetCollectionProvider>
          </AppProvider>
        </VersionsProvider>
      </SWRConfig>
    </JotaiProvider>
  );
}

export default App;
