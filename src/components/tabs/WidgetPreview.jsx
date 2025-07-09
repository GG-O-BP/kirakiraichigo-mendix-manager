import SearchBox from "../common/SearchBox";
import PropertyInput from "../common/PropertyInput";
import { ListArea } from "../common/ListItems";

const WidgetPreview = ({
  widgetPreviewSearch,
  setWidgetPreviewSearch,
  listData,
  handleItemClick,
  properties,
  updateProperty,
}) => {
  return (
    <div className="widget-preview">
      <div className="preview-left">
        <SearchBox
          placeholder="Search components..."
          value={widgetPreviewSearch}
          onChange={setWidgetPreviewSearch}
        />
        <ListArea
          items={listData}
          searchTerm={widgetPreviewSearch}
          onItemClick={handleItemClick}
        />
      </div>
      <div className="preview-middle">
        <h3>🍓 Properties</h3>
        <div className="property-section">
          <PropertyInput
            label="Berry Name"
            type="text"
            value={properties.prop1}
            onChange={(value) => updateProperty("prop1", value)}
          />
          <PropertyInput
            label="Berry Color"
            type="text"
            value={properties.prop2}
            onChange={(value) => updateProperty("prop2", value)}
          />
          <PropertyInput
            label="Description"
            type="textarea"
            value={properties.prop3}
            onChange={(value) => updateProperty("prop3", value)}
          />
          <PropertyInput
            label="Berry Type"
            type="select"
            value={properties.prop4}
            onChange={(value) => updateProperty("prop4", value)}
            options={["Select...", "Sweet", "Sour", "Sparkly"]}
          />
        </div>
      </div>
      <div className="preview-right">
        <h3>✨ Widget Preview</h3>
        <div className="widget-content">
          <div className="preview-placeholder">
            <span className="berry-icon">🍓</span>
            <p>Widget content will sparkle here</p>
            <div className="sparkle-animation">✨ ✨ ✨</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetPreview;
