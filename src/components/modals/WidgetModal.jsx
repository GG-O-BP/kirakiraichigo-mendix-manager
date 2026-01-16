import * as R from "ramda";
import { memo } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { saveToStorage, STORAGE_KEYS, createWidget } from "../../utils/functional";
import { extractFolderNameFromPath } from "../../utils/dataProcessing";

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

const handleAddWidgetSubmit = R.curry(async (props) => {
  if (hasValidCaptionAndPath(props)) {
    const { newWidgetCaption, newWidgetPath, setWidgets } = props;

    try {
      const isValid = await invoke("validate_mendix_widget", {
        widgetPath: newWidgetPath,
      });

      if (!isValid) {
        alert(
          "Invalid Mendix Widget: The selected path does not contain a valid Mendix widget.\n\n" +
            "A valid Mendix widget must have a 'src/package.xml' file that contains 'mendix' namespace.",
        );
        return;
      }

      R.pipe(
        () => createWidget(newWidgetCaption, newWidgetPath),
        (newWidget) =>
          setWidgets((prev) => {
            const newWidgets = [...prev, newWidget];
            saveToStorage(STORAGE_KEYS.WIDGETS, newWidgets).catch(console.error);
            return newWidgets;
          }),
        () => closeFormAndResetFields(props),
        R.always(undefined),
      )();
    } catch (error) {
      alert(
        `Validation Error: ${error}\n\n` +
          "Please ensure the selected path contains a valid Mendix widget with 'src/package.xml' file.",
      );
    }
  }
});

const handleFolderBrowse = R.curry(async (props) => {
  const { newWidgetCaption, setNewWidgetPath, setNewWidgetCaption } = props;

  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Widget Folder",
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
  (label, type, value, onChange, placeholder, onBrowse) => (
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
          Browse
        </button>
      </div>
    </label>
  ),
);

const renderAddWidgetFormModal = (props) => {
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
          <h3>🍓 Add Widget</h3>
        </div>
        <div className="modal-body">
          {renderLabeledInput(
            "Widget Caption",
            "text",
            newWidgetCaption,
            setNewWidgetCaption,
            "Enter widget caption",
          )}
          {renderLabeledInputWithBrowseButton(
            "Absolute Path",
            "text",
            newWidgetPath,
            setNewWidgetPath,
            "C:\\path\\to\\widget\\folder",
            () => handleFolderBrowse(props),
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
            Cancel
          </button>
          <button
            className="modal-button confirm-button"
            onClick={R.pipe(
              R.tap(() => handleAddWidgetSubmit(props)),
              R.always(undefined),
            )}
            disabled={!hasValidCaptionAndPath(props)}
          >
            Add Widget
          </button>
        </div>
      </div>
    </div>
  );
};

const renderWidgetActionSelectionModal = (props) => {
  const { setShowWidgetModal, setShowAddWidgetForm } = props;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>🍓 Widget Action</h3>
        </div>
        <div className="modal-body">
          <p>Choose an action for widget management:</p>
        </div>
        <div className="modal-footer">
          <button
            className="modal-button cancel-button"
            onClick={R.pipe(
              R.tap(() => setShowWidgetModal(false)),
              R.always(undefined),
            )}
          >
            Cancel
          </button>
          <button
            className="modal-button"
            disabled
            style={DISABLED_BUTTON_STYLE}
          >
            Create Widget
            <br />
            (Coming Soon)
          </button>
          <button
            className="modal-button confirm-button"
            onClick={R.pipe(
              R.tap(() => setShowAddWidgetForm(true)),
              R.always(undefined),
            )}
          >
            Add Existing Widget
          </button>
        </div>
      </div>
    </div>
  );
};

const WidgetModal = memo((props) =>
  R.cond([
    [isAddWidgetFormVisible, renderAddWidgetFormModal],
    [isWidgetActionModalVisible, renderWidgetActionSelectionModal],
    [R.T, R.always(null)],
  ])(props),
);

WidgetModal.displayName = "WidgetModal";

export default WidgetModal;
