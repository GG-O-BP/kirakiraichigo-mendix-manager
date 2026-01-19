import { ConfirmModal } from "../../common";
import WidgetModal from "../WidgetModal";

/**
 * WidgetModals - Domain component for widget-related modals
 * Handles widget add/manage and widget delete confirmation dialogs
 */
function WidgetModals({
  widgetModal,
  widgetDeleteModal,
  newWidgetCaption,
  setNewWidgetCaption,
  newWidgetPath,
  setNewWidgetPath,
  setWidgets,
  handleAddWidget,
  handleWidgetDelete,
}) {
  const handleConfirmAddWidget = () => {
    handleAddWidget(() => {
      widgetModal.setShowAddForm(false);
      widgetModal.setShowModal(false);
    });
  };

  const handleConfirmWidgetDelete = async () => {
    const success = await handleWidgetDelete(widgetDeleteModal.widgetToDelete);
    if (success) {
      widgetDeleteModal.close();
    }
  };

  return (
    <>
      <WidgetModal
        showWidgetModal={widgetModal.showModal}
        showAddWidgetForm={widgetModal.showAddForm}
        setShowWidgetModal={widgetModal.setShowModal}
        setShowAddWidgetForm={widgetModal.setShowAddForm}
        newWidgetCaption={newWidgetCaption}
        setNewWidgetCaption={setNewWidgetCaption}
        newWidgetPath={newWidgetPath}
        setNewWidgetPath={setNewWidgetPath}
        setWidgets={setWidgets}
      />

      <ConfirmModal
        isOpen={widgetDeleteModal.showModal}
        title="🍓 Remove Widget from List?"
        message={
          widgetDeleteModal.widgetToDelete
            ? `Should I remove "${widgetDeleteModal.widgetToDelete.caption}" from your widget list? 🎀\n\nDon't worry! This only removes it from my list - your files will stay safe and sound! 🌟`
            : ""
        }
        onConfirm={handleConfirmWidgetDelete}
        onCancel={widgetDeleteModal.close}
        isLoading={false}
        relatedApps={[]}
      />
    </>
  );
}

export default WidgetModals;
