// רשימת כרטיסים קטנים (מסעדות, חנויות, ברים וכו'): שם, מיקום והערה
const Spots = ({ items }) => (
  <ul className="spots">
    {items.map((s) => (
      <li key={s.name} className="spot">
        <strong className="spot__name" dir="auto">{s.name}</strong>
        {s.where && <span className="spot__where" dir="auto">{s.where}</span>}
        <span className="spot__note">{s.note}</span>
      </li>
    ))}
  </ul>
);

export default Spots;
