import StudioProModals from "./domain/StudioProModals";
import AppDeleteModals from "./domain/AppDeleteModals";
import WidgetModals from "./domain/WidgetModals";
import BuildResultModals from "./domain/BuildResultModals";

/**
 * AppModals component - composition component that renders all modal dialogs
 * Domain-specific modal components consume context directly
 */
function AppModals() {
  return (
    <>
      <StudioProModals />
      <AppDeleteModals />
      <WidgetModals />
      <BuildResultModals />
    </>
  );
}

export default AppModals;
