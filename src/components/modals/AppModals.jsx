import StudioProModals from "./domain/StudioProModals";
import AppDeleteModals from "./domain/AppDeleteModals";
import WidgetModals from "./domain/WidgetModals";
import BuildResultModals from "./domain/BuildResultModals";

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
