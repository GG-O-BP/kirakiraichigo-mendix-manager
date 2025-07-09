const PropertyInput = ({ label, type, value, onChange, options = [] }) => {
  const renderInput = () => {
    switch (type) {
      case "text":
        return (
          <input
            type="text"
            className="property-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "textarea":
        return (
          <textarea
            className="property-textarea"
            rows="4"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "select":
        return (
          <select
            className="property-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <label className="property-label">
      <span className="label-text">{label}</span>
      {renderInput()}
    </label>
  );
};

export default PropertyInput;
