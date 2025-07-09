const SearchBox = ({ placeholder, value, onChange }) => (
  <div className="search-container">
    <span className="search-icon">🔍</span>
    <input
      type="text"
      className="search-box"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    <span className="sparkle">✨</span>
  </div>
);

export default SearchBox;
