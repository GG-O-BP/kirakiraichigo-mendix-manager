import * as R from "ramda";
import { memo, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { saveToStorage, STORAGE_KEYS, invokeCreateWidget } from "../../utils";
import { extractFolderNameFromPath } from "../../utils/data-processing/pathUtils";
import { useI18n } from "../../i18n/useI18n";

const DISABLED_BUTTON_STYLE = {
  opacity: 0.5,
  cursor: "not-allowed",
  background: "linear-gradient(135deg, rgba(169, 169, 169, 0.3) 0%, rgba(169, 169, 169, 0.5) 100%)",
};

const BROWSE_INPUT_CONTAINER_STYLE = { display: "flex", gap: "8px" };
const BROWSE_INPUT_STYLE = { flex: 1 };

const isAddWidgetFormVisible = R.both(
  R.prop("showWidgetModal"),
  R.prop("showAddWidgetForm"),
);

const isWidgetActionModalVisible = R.both(
  R.prop("showWidgetModal"),
  R.complement(R.prop("showAddWidgetForm")),
);

const hasValidCaptionAndPath = R.both(
  R.pipe(R.prop("newWidgetCaption"), R.complement(R.isEmpty)),
  R.pipe(R.prop("newWidgetPath"), R.complement(R.isEmpty)),
);

const closeFormAndResetFields = R.curry((props) =>
  R.pipe(
    R.tap(() => props.setShowAddWidgetForm(false)),
    R.tap(() => props.setShowWidgetModal(false)),
    R.tap(() => props.setNewWidgetCaption("")),
    R.tap(() => props.setNewWidgetPath("")),
    R.always(undefined),
  )(),
);

const handleCancelClick = R.curry((props) => closeFormAndResetFields(props));

const handleAddWidgetSubmit = R.curry(async (props, t) => {
  if (hasValidCaptionAndPath(props)) {
    const { newWidgetCaption, newWidgetPath, setWidgets } = props;

    try {
      const isValid = await invoke("validate_mendix_widget", {
        widgetPath: newWidgetPath,
      });

      if (!isValid) {
        alert(R.pathOr(
          "Invalid Mendix Widget: The selected path does not contain a valid Mendix widget.\n\nA valid Mendix widget must have a 'src/package.xml' file that contains 'mendix' namespace.",
          ["modals", "widget", "invalidWidget"],
          t,
        ));
        return;
      }

      const newWidget = await invokeCreateWidget(newWidgetCaption, newWidgetPath);
      setWidgets((prev) => {
        const newWidgets = [...prev, newWidget];
        saveToStorage(STORAGE_KEYS.WIDGETS, newWidgets).catch(console.error);
        return newWidgets;
      });
      closeFormAndResetFields(props);
    } catch (error) {
      alert(
        R.pathOr(
          `Validation Error: ${error}\n\nPlease ensure the selected path contains a valid Mendix widget with 'src/package.xml' file.`,
          ["modals", "widget", "validationError"],
          t,
        ).replace("{error}", error),
      );
    }
  }
});

const handleFolderBrowse = R.curry(async (props, t) => {
  const { newWidgetCaption, setNewWidgetPath, setNewWidgetCaption } = props;

  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: R.pathOr("Select Widget Folder", ["widgets", "selectFolder"], t),
    });

    if (selected) {
      const folderPath = selected;
      setNewWidgetPath(folderPath);

      if (R.isEmpty(newWidgetCaption.trim())) {
        const folderName = await extractFolderNameFromPath(folderPath);
        setNewWidgetCaption(folderName);
      }
    }
  } catch (error) {
    console.error("Error selecting folder:", error);
  }
});

const renderTextInput = R.curry((type, value, onChange, placeholder) => (
  <input
    type={type}
    className="property-input"
    value={value}
    onChange={R.pipe(R.path(["target", "value"]), onChange)}
    placeholder={placeholder}
  />
));

const renderLabeledInput = R.curry(
  (label, type, value, onChange, placeholder) => (
    <label className="property-label">
      <span className="label-text">{label}</span>
      {renderTextInput(type, value, onChange, placeholder)}
    </label>
  ),
);

const renderLabeledInputWithBrowseButton = R.curry(
  (label, type, value, onChange, placeholder, onBrowse, browseText) => (
    <label className="property-label">
      <span className="label-text">{label}</span>
      <div style={BROWSE_INPUT_CONTAINER_STYLE}>
        <input
          type={type}
          className="property-input"
          value={value}
          onChange={R.pipe(R.path(["target", "value"]), onChange)}
          placeholder={placeholder}
          style={BROWSE_INPUT_STYLE}
        />
        <button
          type="button"
          className="modal-button browse-button"
          onClick={onBrowse}
        >
          <span className="button-icon">📁</span>
          {browseText}
        </button>
      </div>
    </label>
  ),
);

const AddWidgetFormModal = (props) => {
  const { t } = useI18n();
  const {
    newWidgetCaption,
    setNewWidgetCaption,
    newWidgetPath,
    setNewWidgetPath,
  } = props;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>🍓 {R.pathOr("Add Widget", ["modals", "widget", "title"], t)}</h3>
        </div>
        <div className="modal-body">
          {renderLabeledInput(
            R.pathOr("Widget Caption", ["widgets", "caption"], t),
            "text",
            newWidgetCaption,
            setNewWidgetCaption,
            R.pathOr("Enter widget caption", ["widgets", "enterCaption"], t),
          )}
          {renderLabeledInputWithBrowseButton(
            R.pathOr("Absolute Path", ["widgets", "absolutePath"], t),
            "text",
            newWidgetPath,
            setNewWidgetPath,
            R.pathOr("C:\\path\\to\\widget\\folder", ["widgets", "pathPlaceholder"], t),
            () => handleFolderBrowse(props, t),
            R.pathOr("Browse", ["common", "browse"], t),
          )}
        </div>
        <div className="modal-footer">
          <button
            className="modal-button cancel-button"
            onClick={R.pipe(
              R.tap(() => handleCancelClick(props)),
              R.always(undefined),
            )}
          >
            {R.pathOr("Cancel", ["common", "cancel"], t)}
          </button>
          <button
            className="modal-button confirm-button"
            onClick={R.pipe(
              R.tap(() => handleAddWidgetSubmit(props, t)),
              R.always(undefined),
            )}
            disabled={!hasValidCaptionAndPath(props)}
          >
            {R.pathOr("Add Widget", ["widgets", "addWidget"], t)}
          </button>
        </div>
      </div>
    </div>
  );
};

const WidgetActionSelectionModal = (props) => {
  const { t } = useI18n();
  const { setShowWidgetModal, setShowAddWidgetForm } = props;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>🍓 {R.pathOr("Widget Action", ["modals", "widget", "actionTitle"], t)}</h3>
        </div>
        <div className="modal-body">
          <p>{R.pathOr("Choose an action for widget management:", ["modals", "widget", "chooseAction"], t)}</p>
        </div>
        <div className="modal-footer">
          <button
            className="modal-button cancel-button"
            onClick={R.pipe(
              R.tap(() => setShowWidgetModal(false)),
              R.always(undefined),
            )}
          >
            {R.pathOr("Cancel", ["common", "cancel"], t)}
          </button>
          <button
            className="modal-button"
            disabled
            style={DISABLED_BUTTON_STYLE}
          >
            {R.pathOr("Create Widget", ["widgets", "createWidget"], t)}
            <br />
            {R.pathOr("(Coming Soon)", ["common", "comingSoon"], t)}
          </button>
          <button
            className="modal-button confirm-button"
            onClick={R.pipe(
              R.tap(() => setShowAddWidgetForm(true)),
              R.always(undefined),
            )}
          >
            {R.pathOr("Add Existing Widget", ["widgets", "addExistingWidget"], t)}
          </button>
        </div>
      </div>
    </div>
  );
};

const WidgetModal = memo((props) => {
  const { showWidgetModal, showAddWidgetForm } = props;
  const isModalVisible = R.or(
    isAddWidgetFormVisible(props),
    isWidgetActionModalVisible(props),
  );

  useEffect(() => {
    if (!isModalVisible) return;

    const handleKeyDown = R.when(
      R.propEq("Escape", "key"),
      R.tap(() => handleCancelClick(props)),
    );
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showWidgetModal, showAddWidgetForm, isModalVisible]);

  return R.cond([
    [isAddWidgetFormVisible, AddWidgetFormModal],
    [isWidgetActionModalVisible, WidgetActionSelectionModal],
    [R.T, R.always(null)],
  ])(props);
});

WidgetModal.displayName = "WidgetModal";

export default WidgetModal;
