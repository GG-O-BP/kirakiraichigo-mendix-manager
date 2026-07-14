import * as R from "ramda";
import { useAtomValue, useSetAtom } from "jotai";
import { ConfirmModal } from "../../common";
import { useI18n } from "../../../i18n/useI18n";
import { useApps, useBuildDeploy } from "../../../hooks";
import {
  showAppDeleteModalAtom,
  appToDeleteAtom,
  closeAppDeleteModalAtom,
} from "../../../atoms";

function AppDeleteModals() {
  const { t } = useI18n();

  const showAppDeleteModal = useAtomValue(showAppDeleteModalAtom);
  const appToDelete = useAtomValue(appToDeleteAtom);
  const closeAppDeleteModal = useSetAtom(closeAppDeleteModalAtom);

  const { handleDeleteApp } = useApps();
  const { isUninstalling, setIsUninstalling } = useBuildDeploy();

  const handleConfirmAppDelete = () =>
    R.when(
      R.isNotNil,
      (app) => {
        setIsUninstalling(true);
        return R.pipe(
          () => handleDeleteApp(R.prop("path", app)),
          R.andThen(
            R.pipe(
              R.tap(() => setIsUninstalling(false)),
              R.tap(() => closeAppDeleteModal()),
            ),
          ),
          R.otherwise(
            R.pipe(
              R.tap((error) =>
                alert(
                  R.replace(
                    "{error}",
                    error,
                    R.pathOr(
                      `Failed to delete app: ${error}`,
                      ["modals", "appDelete", "deleteFailed"],
                      t,
                    ),
                  ),
                ),
              ),
              R.tap(() => setIsUninstalling(false)),
              R.tap(() => closeAppDeleteModal()),
            ),
          ),
        )();
      },
    )(appToDelete);

  const deleteTitle = R.pathOr(
    "Delete This App?",
    ["modals", "appDelete", "title"],
    t,
  );

  const deleteMessage = R.ifElse(
    R.isNil,
    R.always(""),
    (app) =>
      R.replace(
        "{name}",
        R.prop("name", app),
        R.pathOr(
          `Do you really want to delete ${R.prop("name", app)}?\n\nI can't undo this once it's done! Are you absolutely sure?`,
          ["modals", "appDelete", "message"],
          t,
        ),
      ),
  )(appToDelete);

  return (
    <ConfirmModal
      isOpen={showAppDeleteModal}
      title={deleteTitle}
      message={deleteMessage}
      onConfirm={handleConfirmAppDelete}
      onCancel={closeAppDeleteModal}
      isLoading={isUninstalling}
      relatedApps={[]}
    />
  );
}

export default AppDeleteModals;
