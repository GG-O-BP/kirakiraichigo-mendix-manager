import { ConfirmModal } from "../../common";
import WidgetModal from "../WidgetModal";
import {
  useModalContext,
  useWidgetCollectionContext,
  useWidgetFormContext,
} from "../../../contexts";

/**
 * WidgetModals - Domain component for widget-related modals
 * Handles widget add/manage and widget delete confirmation dialogs
 * Consumes context directly instead of receiving props
 */
function WidgetModals() {
  const {
    showWidgetModal,
    showAddWidgetForm,
    setShowWidgetModal,
    setShowAddWidgetForm,
    showWidgetDeleteModal,
    widgetToDelete,
    closeWidgetDeleteModal,
  } = useModalContext();

  const {
    setWidgets,
    handleAddWidget,
    handleWidgetDelete,
  } = useWidgetCollectionContext();

  const {
    newWidgetCaption,
    setNewWidgetCaption,
    newWidgetPath,
    setNewWidgetPath,
  } = useWidgetFormContext();

  const handleConfirmAddWidget = () => {
    handleAddWidget(() => {
      setShowAddWidgetForm(false);
      setShowWidgetModal(false);
    });
  };

  const handleConfirmWidgetDelete = async () => {
    const success = await handleWidgetDelete(widgetToDelete);
    if (success) {
      closeWidgetDeleteModal();
    }
  };

  return (
    <>
      <WidgetModal
        showWidgetModal={showWidgetModal}
        showAddWidgetForm={showAddWidgetForm}
        setShowWidgetModal={setShowWidgetModal}
        setShowAddWidgetForm={setShowAddWidgetForm}
        newWidgetCaption={newWidgetCaption}
        setNewWidgetCaption={setNewWidgetCaption}
        newWidgetPath={newWidgetPath}
        setNewWidgetPath={setNewWidgetPath}
        setWidgets={setWidgets}
      />

      <ConfirmModal
        isOpen={showWidgetDeleteModal}
        title="🍓 Remove Widget from List?"
        message={
          widgetToDelete
            ? `Should I remove "${widgetToDelete.caption}" from your widget list? 🎀\n\nDon't worry! This only removes it from my list - your files will stay safe and sound! 🌟`
            : ""
        }
        onConfirm={handleConfirmWidgetDelete}
        onCancel={closeWidgetDeleteModal}
        isLoading={false}
        relatedApps={[]}
      />
    </>
  );
}

export default WidgetModals;
