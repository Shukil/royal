import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from './api';
import { getToken } from './session';

const formatDate = (iso) => iso.split('-').reverse().join('.');

// יומן העדכונים של האתר. התוכן מגיע מהשרת רק למנהלים (ADMIN_EMAILS בשרת); לכל השאר הדף לא קיים
const Updates = () => {
  const [state, setState] = useState({ status: getToken() ? 'loading' : 'denied', changelog: [] });

  useEffect(() => {
    if (!getToken()) return undefined;
    let alive = true;
    api.get('/updates')
      .then((res) => alive && setState({ status: 'ready', changelog: res.data.changelog }))
      .catch((err) => alive && setState({ status: err.response ? 'denied' : 'error', changelog: [] }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.status === 'denied') return <Navigate to="/" replace />;

  return (
    <div className="page">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">עדכוני האתר 🛠️</h1>
          <p className="card__lead">כל מה שנוסף לאתר, לפי תאריכים. הדף מוצג רק למנהלי האתר.</p>
        </header>

        <div className="card__body updates">
          {state.status === 'loading' && <p className="empty">טוען…</p>}
          {state.status === 'error' && <p className="alert alert--error" role="alert">לא הצלחנו לטעון את העדכונים. צריך חיבור לאינטרנט.</p>}

          {state.changelog.map((release) => (
            <section key={release.date} className="updates__release" aria-labelledby={`rel-${release.date}`}>
              <h2 id={`rel-${release.date}`} className="updates__date">
                <span dir="ltr">{formatDate(release.date)}</span> · {release.title}
              </h2>

              {release.groups.map((g) => (
                <div key={g.area} className="updates__group">
                  <h3 className="updates__area">{g.area}</h3>
                  <ul className="updates__list">
                    {g.items.map((item) => (
                      <li key={item.title} className="update">
                        <div className="update__head">
                          <span className="update__title">{item.title}</span>
                          <span className={item.status === 'setup' ? 'plan-badge' : 'plan-badge plan-badge--ok'}>
                            {item.status === 'setup' ? '⚙️ צריך הגדרה בשרת' : '✓ באוויר'}
                          </span>
                        </div>
                        <p className="update__what">{item.what}</p>
                        {item.note && <p className="update__note">💡 {item.note}</p>}
                        {item.to && <Link to={item.to} className="update__link">לראות באתר ←</Link>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
};

export default Updates;
