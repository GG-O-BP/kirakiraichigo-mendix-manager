const ListItem = ({ item, onClick, children }) => (
  <div className="list-item" onClick={() => onClick(item)}>
    <span className="item-icon">{item.icon || "🍓"}</span>
    <span className="item-label">{item.label}</span>
    {children}
    <span className="item-sparkle">·</span>
  </div>
);

export default ListItem;
