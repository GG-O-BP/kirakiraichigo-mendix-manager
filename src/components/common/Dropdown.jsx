const Dropdown = ({ value, onChange, options }) => (
  <div className="dropdown-container">
    <select
      className="dropdown"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <span className="dropdown-icon">🍓</span>
  </div>
);

export default Dropdown;
