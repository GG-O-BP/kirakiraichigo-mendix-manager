import * as R from "ramda";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ConfirmModal } from "../../common";
import WidgetModal from "../WidgetModal";
import { useI18n } from "../../../i18n/useI18n";
import { useWidgets, useWidgetForm } from "../../../hooks";
import {
  showWidgetModalAtom,
  showAddWidgetFormAtom,
  showWidgetDeleteModalAtom,
  widgetToDeleteAtom,
  closeWidgetDeleteModalAtom,
} from "../../../atoms";

function WidgetModals() {
  const { t } = useI18n();

  const [showWidgetModal, setShowWidgetModal] = useAtom(showWidgetModalAtom);
  const [showAddWidgetForm, setShowAddWidgetForm] = useAtom(showAddWidgetFormAtom);
  const showWidgetDeleteModal = useAtomValue(showWidgetDeleteModalAtom);
  const widgetToDelete = useAtomValue(widgetToDeleteAtom);
  const closeWidgetDeleteModal = useSetAtom(closeWidgetDeleteModalAtom);

  const {
    setWidgets,
    handleAddWidget,
    handleWidgetDelete,
  } = useWidgets();

  const {
    newWidgetCaption,
    setNewWidgetCaption,
    newWidgetPath,
    setNewWidgetPath,
    resetForm,
    isValid: isFormValid,
  } = useWidgetForm();

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
        resetForm={resetForm}
        isFormValid={isFormValid}
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
