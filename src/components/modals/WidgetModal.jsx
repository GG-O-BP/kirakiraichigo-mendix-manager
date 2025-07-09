const WidgetModal = ({
  showWidgetModal,
  showAddWidgetForm,
  setShowWidgetModal,
  setShowAddWidgetForm,
  newWidgetCaption,
  setNewWidgetCaption,
  newWidgetPath,
  setNewWidgetPath,
  setWidgets,
}) => {
  if (!showWidgetModal) return null;

  if (showAddWidgetForm) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Add Widget</h3>
          </div>
          <div className="modal-body">
            <label className="property-label">
              <span className="label-text">Widget Caption</span>
              <input
                type="text"
                className="property-input"
                value={newWidgetCaption}
                onChange={(e) => setNewWidgetCaption(e.target.value)}
                placeholder="Enter widget caption"
              />
            </label>
            <label className="property-label">
              <span className="label-text">Absolute Path</span>
              <input
                type="text"
                className="property-input"
                value={newWidgetPath}
                onChange={(e) => setNewWidgetPath(e.target.value)}
                placeholder="C:\path\to\widget\folder"
              />
            </label>
          </div>
          <div className="modal-footer">
            <button
              className="modal-button cancel-button"
              onClick={() => {
                setShowAddWidgetForm(false);
                setShowWidgetModal(false);
                setNewWidgetCaption("");
                setNewWidgetPath("");
              }}
            >
              Cancel
            </button>
            <button
              className="modal-button confirm-button"
              onClick={() => {
                if (newWidgetCaption && newWidgetPath) {
                  setWidgets((prev) => {
                    const newWidgets = [
                      ...prev,
                      {
                        id: Date.now().toString(),
                        caption: newWidgetCaption,
                        path: newWidgetPath,
                      },
                    ];
                    localStorage.setItem(
                      "kirakiraWidgets",
                      JSON.stringify(newWidgets),
                    );
                    return newWidgets;
                  });
                  setShowAddWidgetForm(false);
                  setShowWidgetModal(false);
                  setNewWidgetCaption("");
                  setNewWidgetPath("");
                }
              }}
              disabled={!newWidgetCaption || !newWidgetPath}
            >
              Add Widget
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Widget Action</h3>
        </div>
        <div className="modal-body">
          <p>Choose an action for widget management:</p>
        </div>
        <div className="modal-footer">
          <button
            className="modal-button cancel-button"
            onClick={() => setShowWidgetModal(false)}
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
            Create Widget (Coming Soon)
          </button>
          <button
            className="modal-button confirm-button"
            onClick={() => setShowAddWidgetForm(true)}
          >
            Add Existing Widget
          </button>
        </div>
      </div>
    </div>
  );
};

export default WidgetModal;
