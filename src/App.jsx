import * as R from "ramda";
import React, { useState, useMemo } from "react";
import "./styles/index.css";

import { TabButton, AppHeader } from "./components/common";
import { StudioProManager, WidgetManager, WidgetPreview } from "./components/tabs";
import { AppModals } from "./components/modals";

import { useAppInitialization, useContextValues } from "./hooks";
import {
  AppProvider,
  WidgetCollectionProvider,
  WidgetPreviewProvider,
  WidgetFormProvider,
  BuildDeployProvider,
  ModalProvider,
  VersionsProvider,
} from "./contexts";

const TAB_CONFIGURATIONS = [
  ["studio-pro", "Studio Pro Manager", StudioProManager],
  ["widget-manager", "Widget Manager", WidgetManager],
  ["widget-preview", "Widget Preview", WidgetPreview],
];

function App() {
  const { theme, versions, appsHook, widgetsHook, widgetPreviewHook, buildDeploy, modals } =
    useAppInitialization();

  const {
    appContextValue,
    widgetCollectionContextValue,
    widgetPreviewContextValue,
    widgetFormContextValue,
    buildDeployContextValue,
    modalContextValue,
    versionsContextValue,
  } = useContextValues({ appsHook, widgetsHook, widgetPreviewHook, buildDeploy, modals, versions });

  const [activeTab, setActiveTab] = useState("studio-pro");

  const createTabFromConfig = R.curry((config) => {
    const [id, label, Component] = config;
    const componentElement = R.cond([
      [R.equals("studio-pro"), () => React.createElement(Component)],
      [R.equals("widget-manager"), () => React.createElement(Component)],
      [R.equals("widget-preview"), () => React.createElement(Component)],
      [R.T, () => null],
    ])(id);

    return { id, label, component: componentElement };
  });

  const tabs = useMemo(
    () => R.map(createTabFromConfig, TAB_CONFIGURATIONS),
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

  const renderTabButton = R.curry((activeTab, setActiveTab, tab) => (
    <TabButton
      key={R.prop("id", tab)}
      label={R.prop("label", tab)}
      isActive={R.equals(activeTab, R.prop("id", tab))}
      onClick={() => setActiveTab(R.prop("id", tab))}
    />
  ));

  return (
    <ModalProvider value={modalContextValue}>
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
                    />

                    <div className="tabs">
                      {R.map(renderTabButton(activeTab, setActiveTab), tabs)}
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
    </ModalProvider>
  );
}

export default App;
