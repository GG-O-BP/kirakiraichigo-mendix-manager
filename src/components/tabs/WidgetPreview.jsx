import * as R from "ramda";
import { memo } from "react";
import SearchBox from "../common/SearchBox";
import PropertyInput from "../common/PropertyInput";
import { ListArea } from "../common/ListItems";

// ============= Helper Functions =============

// Render properties section
const renderPropertiesSection = R.curry((properties, updateProperty) => (
  <div className="property-section">
    <PropertyInput
      label="Berry Name"
      type="text"
      value={R.prop("prop1", properties)}
      onChange={updateProperty("prop1")}
    />
    <PropertyInput
      label="Berry Color"
      type="text"
      value={R.prop("prop2", properties)}
      onChange={updateProperty("prop2")}
    />
    <PropertyInput
      label="Description"
      type="textarea"
      value={R.prop("prop3", properties)}
      onChange={updateProperty("prop3")}
    />
    <PropertyInput
      label="Berry Type"
      type="select"
      value={R.prop("prop4", properties)}
      onChange={updateProperty("prop4")}
      options={["Select...", "Sweet", "Sour", "Sparkly"]}
    />
  </div>
));

// Render preview placeholder
const renderPreviewPlaceholder = () => (
  <div className="preview-placeholder">
    <span className="berry-icon">🍓</span>
    <p>Widget content will sparkle here</p>
    <div className="sparkle-animation">✨ ✨ ✨</div>
  </div>
);

// ============= Main Component =============

const WidgetPreview = memo(
  ({
    widgetPreviewSearch,
    setWidgetPreviewSearch,
    listData,
    handleItemClick,
    properties,
    updateProperty,
  }) => {
    return (
      <div className="widget-preview">
        {/* Left Panel - Component Search */}
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

        {/* Middle Panel - Properties */}
        <div className="preview-middle">
          <h3>🍓 Properties</h3>
          {renderPropertiesSection(properties, updateProperty)}
        </div>

        {/* Right Panel - Widget Preview */}
        <div className="preview-right">
          <h3>✨ Widget Preview</h3>
          <div className="widget-content">{renderPreviewPlaceholder()}</div>
        </div>
      </div>
    );
  },
);

WidgetPreview.displayName = "WidgetPreview";

export default WidgetPreview;
