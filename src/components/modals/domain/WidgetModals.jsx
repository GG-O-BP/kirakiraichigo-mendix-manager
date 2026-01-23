import * as R from "ramda";
import { ConfirmModal } from "../../common";
import WidgetModal from "../WidgetModal";
import { useI18n } from "../../../i18n/useI18n";
import {
  useWidgetModalContext,
  useWidgetCollectionContext,
  useWidgetFormContext,
} from "../../../contexts";

function WidgetModals() {
  const { t } = useI18n();
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

  const removeTitle = R.pathOr(
    "Remove Widget from List?",
    ["modals", "widgetRemove", "title"],
    t,
  );

  const removeMessage = widgetToDelete
    ? R.pathOr(
        `Should I remove "${widgetToDelete.caption}" from your widget list?\n\nDon't worry! This only removes it from my list - your files will stay safe and sound!`,
        ["modals", "widgetRemove", "message"],
        t,
      ).replace("{caption}", widgetToDelete.caption)
    : "";

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
        title={removeTitle}
        message={removeMessage}
        onConfirm={handleConfirmWidgetDelete}
        onCancel={closeWidgetDeleteModal}
        isLoading={false}
        relatedApps={[]}
      />
    </>
  );
}

export default WidgetModals;
