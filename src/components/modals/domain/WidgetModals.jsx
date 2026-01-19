import { ConfirmModal } from "../../common";
import WidgetModal from "../WidgetModal";
import {
  useWidgetModalContext,
  useWidgetCollectionContext,
  useWidgetFormContext,
} from "../../../contexts";

/**
 * WidgetModals - Domain component for widget-related modals
 * Handles widget add/manage and widget delete confirmation dialogs
 * Consumes domain-specific WidgetModalContext
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
  } = useWidgetModalContext();

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
        title="\ud83c\udf53 Remove Widget from List?"
        message={
          widgetToDelete
            ? `Should I remove "${widgetToDelete.caption}" from your widget list? \ud83c\udf80\n\nDon't worry! This only removes it from my list - your files will stay safe and sound! \ud83c\udf1f`
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
