import * as R from "ramda";
import { memo } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

// ============= Helper Functions =============

// Check if should show add widget form
const shouldShowAddForm = R.both(
  R.prop("showWidgetModal"),
  R.prop("showAddWidgetForm"),
);

// Check if should show widget modal
const shouldShowModal = R.both(
  R.prop("showWidgetModal"),
  R.complement(R.prop("showAddWidgetForm")),
);

// Create widget from form data
const createWidgetFromForm = R.curry((caption, path) => ({
  id: Date.now().toString(),
  caption,
  path,
}));

// Validate widget form
const isValidWidgetForm = R.both(
  R.pipe(R.prop("newWidgetCaption"), R.complement(R.isEmpty)),
  R.pipe(R.prop("newWidgetPath"), R.complement(R.isEmpty)),
);

// Reset form fields with strict functional programming
const resetFormFields = R.curry((props) =>
  R.pipe(
    R.tap(() => props.setShowAddWidgetForm(false)),
    R.tap(() => props.setShowWidgetModal(false)),
    R.tap(() => props.setNewWidgetCaption("")),
    R.tap(() => props.setNewWidgetPath("")),
    R.always(undefined),
  )(),
);

// Handle cancel action
const handleCancel = R.curry((props) => resetFormFields(props));

// Handle add widget
const handleAddWidget = R.curry(async (props) => {
  if (isValidWidgetForm(props)) {
    const { newWidgetCaption, newWidgetPath, setWidgets } = props;

    try {
      // Validate if path contains a valid Mendix widget
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
        () => createWidgetFromForm(newWidgetCaption, newWidgetPath),
        (newWidget) =>
          setWidgets((prev) => {
            const newWidgets = [...prev, newWidget];
            localStorage.setItem("kirakiraWidgets", JSON.stringify(newWidgets));
            return newWidgets;
          }),
        () => resetFormFields(props),
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

// Handle folder selection
const handleBrowseFolder = R.curry(async (props) => {
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

      // Auto-fill caption only if it's empty
      if (R.isEmpty(newWidgetCaption.trim())) {
        const folderName =
          folderPath.split(/[\\/]/).filter(Boolean).pop() || "";
        setNewWidgetCaption(folderName);
      }
    }
  } catch (error) {
    console.error("Error selecting folder:", error);
  }
});

// ============= Render Functions =============

// Render input field
const renderInput = R.curry((type, value, onChange, placeholder) => (
  <input
    type={type}
    className="property-input"
    value={value}
    onChange={R.pipe(R.path(["target", "value"]), onChange)}
    placeholder={placeholder}
  />
));

// Render label with input
const renderLabeledInput = R.curry(
  (label, type, value, onChange, placeholder) => (
    <label className="property-label">
      <span className="label-text">{label}</span>
      {renderInput(type, value, onChange, placeholder)}
    </label>
  ),
);

// Render label with input and browse button
const renderLabeledInputWithBrowse = R.curry(
  (label, type, value, onChange, placeholder, onBrowse) => (
    <label className="property-label">
      <span className="label-text">{label}</span>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type={type}
          className="property-input"
          value={value}
          onChange={R.pipe(R.path(["target", "value"]), onChange)}
          placeholder={placeholder}
          style={{ flex: 1 }}
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

// Render add widget form modal
const renderAddWidgetForm = (props) => {
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
          {renderLabeledInputWithBrowse(
            "Absolute Path",
            "text",
            newWidgetPath,
            setNewWidgetPath,
            "C:\\path\\to\\widget\\folder",
            () => handleBrowseFolder(props),
          )}
        </div>
        <div className="modal-footer">
          <button
            className="modal-button cancel-button"
            onClick={R.pipe(
              R.tap(() => handleCancel(props)),
              R.always(undefined),
            )}
          >
            Cancel
          </button>
          <button
            className="modal-button confirm-button"
            onClick={R.pipe(
              R.tap(() => handleAddWidget(props)),
              R.always(undefined),
            )}
            disabled={!isValidWidgetForm(props)}
          >
            Add Widget
          </button>
        </div>
      </div>
    </div>
  );
};

// Render widget action modal
const renderWidgetActionModal = (props) => {
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
            style={{
              opacity: 0.5,
              cursor: "not-allowed",
              background:
                "linear-gradient(135deg, rgba(169, 169, 169, 0.3) 0%, rgba(169, 169, 169, 0.5) 100%)",
            }}
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

// ============= Main Component =============

const WidgetModal = memo((props) =>
  R.cond([
    [shouldShowAddForm, renderAddWidgetForm],
    [shouldShowModal, renderWidgetActionModal],
    [R.T, R.always(null)],
  ])(props),
);

WidgetModal.displayName = "WidgetModal";

export default WidgetModal;
