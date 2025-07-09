const TabButton = ({ label, isActive, onClick }) => (
  <button className={`tab ${isActive ? "active" : ""}`} onClick={onClick}>
    <span className="tab-icon">🍓</span>
    {label}
    {isActive && <span className="tab-sparkle">✨</span>}
  </button>
);

export default TabButton;
