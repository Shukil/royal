import { Link } from 'react-router-dom';
import { destinations, guideOrder } from './destinations';

const guides = [
  { to: '/rome-guide', name: 'רומא', emoji: '🏛️', day: 'לפני ההפלגה · 12–15.08', lead: 'העיר הנצחית, הוותיקן והנמל בצ׳יוויטווקיה' },
  ...guideOrder.map((id) => ({ to: `/guide/${id}`, ...destinations[id] })),
];

const Guides = () => (
  <div className="page">
    <article className="card">
      <header className="card__header">
        <h1 className="card__title">מדריכי היעדים 🧭</h1>
        <p className="card__lead">מדריך מלא לכל עצירה במסלול, כולל מידע על הנמל</p>
      </header>

      <div className="card__body">
        <ul className="guide-list">
          {guides.map((g) => (
            <li key={g.to}>
              <Link to={g.to} className="guide-card">
                <span className="guide-card__emoji" aria-hidden="true">{g.emoji}</span>
                <span className="guide-card__name">{g.name}</span>
                <span className="guide-card__day">{g.day}</span>
                <span className="guide-card__lead">{g.lead}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </article>
  </div>
);

export default Guides;
