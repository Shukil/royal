import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from './api';
import { EVENT_TYPES, RSVP_LABELS, categoryIcon, formatDay, formatWhen } from './eventTypes';
import { getToken } from './session';
import Notifications from './Notifications';
import EventForm from './EventForm';

const Schedule = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [people, setPeople] = useState(null);
  const [status, setStatus] = useState(getToken() ? 'loading' : 'guest');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');

  const load = useCallback(() => {
    if (!getToken()) return;
    Promise.all([
      api.get('/events'),
      api.get('/events/people'),
    ])
      .then(([ev, pp]) => {
        setEvents(ev.data.events);
        setPeople(pp.data);
        setStatus('ready');
      })
      .catch((err) => {
        if (err.response?.status === 401) setStatus('guest');
        else {
          setError('לא הצלחנו לטעון את הלו״ז. ודא שהשרת פועל ונסה לרענן.');
          setStatus('ready');
        }
      });
  }, []);

  useEffect(load, [load]);

  // אישור הגעה מהטבלה: status=null מבטל את האישור
  const [rsvpBusy, setRsvpBusy] = useState(null);
  const saveRsvp = async (ev, status) => {
    if (rsvpBusy) return;
    setError('');
    setRsvpBusy(ev.id);
    try {
      const { data } = status
        ? await api.put(`/events/${ev.id}/rsvp`, { status })
        : await api.delete(`/events/${ev.id}/rsvp`);
      setEvents((list) => list.map((x) => (x.id === ev.id ? { ...x, myRsvp: data.myRsvp } : x)));
    } catch (err) {
      setError(errorMessage(err, 'לא הצלחנו לעדכן את אישור ההגעה. נסה שוב.'));
    } finally {
      setRsvpBusy(null);
    }
  };

  // לחיצה על "טרם אישרת" פותחת תפריט עם שלוש האפשרויות; לחיצה על אישור קיים מבטלת אותו.
  // התפריט ממוקם ב-position: fixed לפי הכפתור, כי עוטף הטבלה גולל וחותך תוכן שיוצא ממנו
  const [rsvpMenu, setRsvpMenu] = useState(null);
  const onRsvpClick = (ev, e) => {
    e.stopPropagation();
    if (ev.myRsvp) {
      saveRsvp(ev, null);
      return;
    }
    if (rsvpMenu?.ev.id === ev.id) {
      setRsvpMenu(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const MENU_W = 170;
    const MENU_H = 150;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setRsvpMenu({
      ev,
      anchor: e.currentTarget,
      right: Math.max(8, Math.min(vw - r.right, vw - MENU_W - 8)),
      ...(r.bottom + MENU_H > vh ? { bottom: vh - r.top + 4 } : { top: r.bottom + 4 }),
    });
  };
  const closeRsvpMenu = useCallback(() => setRsvpMenu(null), []);
  const pickRsvp = (status) => {
    const { ev } = rsvpMenu;
    setRsvpMenu(null);
    saveRsvp(ev, status);
  };

  if (status === 'guest') {
    return (
      <div className="page">
        <div className="empty">
          <p>כדי לראות את הלו״ז שלך צריך להתחבר.</p>
          <Link to="/login" className="btn btn--primary">להתחברות</Link>
        </div>
      </div>
    );
  }

  const visible = filter ? events.filter((ev) => ev.type === filter) : events;
  const days = visible.reduce((acc, ev) => {
    (acc[ev.date] ||= []).push(ev);
    return acc;
  }, {});

  return (
    <div className="page page--wide">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">הלו״ז שלי 📅</h1>
          <p className="card__lead">כל האירועים שאתה מוזמן אליהם, לפי ימים ושעות. לחיצה על אירוע פותחת את הפרטים.</p>
        </header>

        <div className="card__body">
          {error && <p className="alert alert--error" role="alert">{error}</p>}

          <Notifications />

          <div className="schedule-toolbar">
            <div className="legend" role="group" aria-label="סינון לפי סוג אירוע">
              <button
                type="button"
                className={`legend__item legend__item--any${filter === '' ? ' is-on' : ''}`}
                aria-pressed={filter === ''}
                onClick={() => setFilter('')}
              >
                הכול
              </button>
              {Object.entries(EVENT_TYPES).map(([key, t]) => (
                <button
                  key={key}
                  type="button"
                  className={`legend__item event--${key}${filter === key ? ' is-on' : ''}`}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(filter === key ? '' : key)}
                >
                  <span className="legend__swatch" aria-hidden="true" />
                  {t.short}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn--primary" onClick={() => setShowForm((s) => !s)} aria-expanded={showForm}>
              {showForm ? 'סגירה' : '＋ אירוע חדש'}
            </button>
          </div>

          {showForm && (
            <EventForm
              people={people}
              onSaved={(id) => {
                setShowForm(false);
                navigate(`/schedule/${id}`);
              }}
            />
          )}

          {status === 'loading' ? (
            <p className="empty" role="status">טוען…</p>
          ) : visible.length === 0 ? (
            <p className="empty">{filter ? 'אין אירועים מהסוג הזה.' : 'אין עדיין אירועים בלו״ז. הוסף את הראשון!'}</p>
          ) : (
            <div className="table-wrap">
              <table className="schedule">
                <thead>
                  <tr>
                    <th scope="col">שעה</th>
                    <th scope="col">אירוע</th>
                    <th scope="col">סוג</th>
                    <th scope="col">נוצר ע״י</th>
                    <th scope="col">אישור הגעה שלי</th>
                  </tr>
                </thead>
                {Object.entries(days).map(([date, list]) => (
                  <tbody key={date}>
                    <tr className="schedule__day">
                      <th colSpan={5} scope="colgroup">{formatDay(date)}</th>
                    </tr>
                    {list.map((ev) => (
                      <tr
                        key={ev.id}
                        className={`schedule__row event--${ev.type}`}
                        onClick={() => navigate(`/schedule/${ev.id}`)}
                      >
                        <td className="schedule__time" dir={ev.allDay ? undefined : 'ltr'}>{formatWhen(ev)}</td>
                        <td>
                          <Link to={`/schedule/${ev.id}`} className="schedule__title" onClick={(e) => e.stopPropagation()}>
                            {categoryIcon(ev) && <span aria-hidden="true">{categoryIcon(ev)} </span>}
                            {ev.title}
                          </Link>
                          {ev.location && <span className="schedule__location">📍 {ev.location}</span>}
                        </td>
                        <td>
                          <span className="event-badge">
                            {ev.type === 'family' ? ev.familyLabel : EVENT_TYPES[ev.type].short}
                          </span>
                        </td>
                        <td>{ev.isMine ? 'אני' : ev.createdBy.name}{ev.isSystem && ' 🔒'}</td>
                        <td>
                          <button
                            type="button"
                            className={`schedule__rsvp${ev.myRsvp ? '' : ' schedule__pending'}`}
                            title={ev.myRsvp ? 'לחיצה לביטול אישור ההגעה' : 'לחיצה לבחירת אישור הגעה'}
                            aria-haspopup={ev.myRsvp ? undefined : 'menu'}
                            aria-expanded={ev.myRsvp ? undefined : rsvpMenu?.ev.id === ev.id}
                            disabled={rsvpBusy === ev.id}
                            onClick={(e) => onRsvpClick(ev, e)}
                          >
                            {ev.myRsvp
                              ? `${RSVP_LABELS[ev.myRsvp].icon} ${RSVP_LABELS[ev.myRsvp].label}`
                              : 'טרם אישרת'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </div>
      </article>

      {rsvpMenu && <RsvpMenu menu={rsvpMenu} onPick={pickRsvp} onClose={closeRsvpMenu} />}
    </div>
  );
};

// תפריט קטן לבחירת אישור הגעה מתוך הטבלה.
// נסגר בלחיצה מחוץ לו, ב-Escape, בגלילה או בשינוי גודל החלון
const RsvpMenu = ({ menu, onPick, onClose }) => {
  const ref = useRef(null);
  const { anchor, top, bottom, right } = menu;

  useEffect(() => {
    ref.current?.querySelector('button')?.focus();
    const onDown = (e) => {
      if (!ref.current?.contains(e.target) && !anchor.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        anchor.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [anchor, onClose]);

  return (
    <div ref={ref} className="rsvp-menu" role="menu" aria-label="אישור הגעה" style={{ top, bottom, right }}>
      {Object.entries(RSVP_LABELS).map(([key, r]) => (
        <button key={key} type="button" role="menuitem" className={`rsvp-menu__item rsvp-menu__item--${key}`} onClick={() => onPick(key)}>
          {r.icon} {r.label}
        </button>
      ))}
    </div>
  );
};

export default Schedule;
