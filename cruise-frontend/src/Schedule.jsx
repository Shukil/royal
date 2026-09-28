import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from './api';
import { EVENT_TYPES, RSVP_LABELS, formatDate, formatDay, formatWhen } from './eventTypes';
import { getToken } from './session';

const emptyForm = {
  type: 'all',
  title: '',
  date: '2027-08-15',
  allDay: false,
  time: '10:00',
  endTime: '',
  location: '',
  description: '',
  invitees: [],
};

const Schedule = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [people, setPeople] = useState(null);
  const [status, setStatus] = useState(getToken() ? 'loading' : 'guest');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [checking, setChecking] = useState(null);
  const [conflict, setConflict] = useState(null);

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

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

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

  // הסרת מוזמן מיידית; הוספת מוזמן רק אחרי שבודקים שהוא פנוי בזמן הזה
  const toggleInvitee = async (id) => {
    if (form.invitees.includes(id)) {
      setForm((f) => ({ ...f, invitees: f.invitees.filter((x) => x !== id) }));
      return;
    }
    setChecking(id);
    try {
      const { date, allDay, time, endTime } = form;
      const res = await api.post('/events/availability', { date, allDay, time, endTime, userIds: [id] });
      if (res.data.busy.length) {
        setConflict({ kind: 'busy', items: res.data.busy });
      } else {
        setForm((f) => (f.invitees.includes(id) ? f : { ...f, invitees: [...f.invitees, id] }));
      }
    } catch (err) {
      setError(errorMessage(err, 'בדיקת הזמינות נכשלה. נסה שוב.'));
    } finally {
      setChecking(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.type === 'custom' && form.invitees.length === 0) {
      setError('באירוע בהתאמה אישית צריך לבחור לפחות מוזמן אחד');
      return;
    }
    if (!form.allDay && form.endTime && form.endTime <= form.time) {
      setError('שעת הסיום צריכה להיות אחרי שעת ההתחלה');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/events', form);
      setForm(emptyForm);
      setShowForm(false);
      navigate(`/schedule/${res.data.id}`);
    } catch (err) {
      // בין הבחירה לשליחה אפשר לשנות תאריך/שעה, אז השרת בודק שוב
      const data = err.response?.data;
      if (data?.code === 'INVITEE_BUSY') setConflict({ kind: 'busy', items: data.busy });
      else if (data?.code === 'SHARED_CONFLICT') setConflict({ kind: 'shared', items: data.clashes });
      else setError(data?.message || 'יצירת האירוע נכשלה. נסה שוב.');
    } finally {
      setSaving(false);
    }
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
  const myFamilyLabel = people?.me.family ? people.families[people.me.family] : null;
  const range = people?.range || { min: '2027-07-29', max: '2027-08-22' };
  const others = people?.people.filter((p) => p.id !== people.me.id) || [];

  return (
    <div className="page page--wide">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">הלו״ז שלי 📅</h1>
          <p className="card__lead">כל האירועים שאתה מוזמן אליהם, לפי ימים ושעות. לחיצה על אירוע פותחת את הפרטים.</p>
        </header>

        <div className="card__body">
          {error && <p className="alert alert--error" role="alert">{error}</p>}

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
            <form className="event-form" onSubmit={submit}>
              <fieldset className="type-picker">
                <legend className="field__label">סוג האירוע</legend>
                {Object.entries(EVENT_TYPES).map(([key, t]) => {
                  const disabled = key === 'family' && !people?.me.family;
                  return (
                    <label key={key} className={`type-option event--${key}${disabled ? ' is-disabled' : ''}`}>
                      <input
                        type="radio"
                        name="type"
                        value={key}
                        checked={form.type === key}
                        onChange={update('type')}
                        disabled={disabled}
                      />
                      <span className="type-option__title">{t.label}</span>
                      <span className="type-option__hint">
                        {key === 'family' && myFamilyLabel ? `יופיע בלו״ז של ${myFamilyLabel}` : t.hint}
                        {disabled && ' (שם המשפחה שלך לא משויך למשפחה)'}
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              <div className="field">
                <label className="field__label" htmlFor="ev-title">שם האירוע</label>
                <input id="ev-title" className="input" maxLength={120} value={form.title} onChange={update('title')} required />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="ev-date">תאריך</label>
                <input
                  id="ev-date"
                  className="input"
                  type="date"
                  min={range.min}
                  max={range.max}
                  aria-describedby="ev-date-hint"
                  value={form.date}
                  onChange={update('date')}
                  required
                />
                <span id="ev-date-hint" className="field__hint">
                  אפשר לבחור תאריך בין {formatDate(range.min)} ל-{formatDate(range.max)}
                </span>
              </div>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.allDay}
                  onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))}
                />
                <span>אירוע של יום שלם</span>
              </label>

              {!form.allDay && (
                <div className="field-row">
                  <div className="field">
                    <label className="field__label" htmlFor="ev-time">שעת התחלה</label>
                    <input id="ev-time" className="input" type="time" value={form.time} onChange={update('time')} required />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="ev-end">שעת סיום (לא חובה)</label>
                    <input id="ev-end" className="input" type="time" min={form.time} value={form.endTime} onChange={update('endTime')} />
                  </div>
                </div>
              )}

              <div className="field">
                <label className="field__label" htmlFor="ev-location">מיקום (לא חובה)</label>
                <input
                  id="ev-location"
                  className="input"
                  maxLength={200}
                  placeholder="למשל: הלובי של המלון, סיפון 14, פיאצה נבונה"
                  value={form.location}
                  onChange={update('location')}
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="ev-desc">תיאור האירוע</label>
                <textarea
                  id="ev-desc"
                  className="input textarea"
                  rows={5}
                  maxLength={3000}
                  placeholder="הסבר מפורט: מה עושים, איפה נפגשים, מה להביא…"
                  value={form.description}
                  onChange={update('description')}
                />
              </div>

              {form.type === 'custom' && (
                <fieldset className="invitees">
                  <legend className="field__label">את מי להזמין? ({form.invitees.length} נבחרו)</legend>
                  {others.length === 0 ? (
                    <p className="field__hint">עדיין אין משתמשים נוספים רשומים באתר.</p>
                  ) : (
                    <div className="invitees__list">
                      {others.map((p) => (
                        <label key={p.id} className="invitee">
                          <input
                            type="checkbox"
                            checked={form.invitees.includes(p.id)}
                            disabled={checking === p.id}
                            onChange={() => toggleInvitee(p.id)}
                          />
                          <span>{p.name}</span>
                          {p.family && <span className="invitee__family">{people.families[p.family]}</span>}
                        </label>
                      ))}
                    </div>
                  )}
                </fieldset>
              )}

              <button type="submit" className="btn btn--primary btn--block" disabled={saving}>
                {saving ? 'שומר…' : 'יצירת האירוע'}
              </button>
            </form>
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

      {conflict && <ConflictDialog conflict={conflict} onClose={() => setConflict(null)} />}
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

// חלון קופץ כשאי אפשר לבצע את ההזמנה:
// kind='busy'   - מוזמן בהתאמה אישית כבר תפוס בזמן הזה
// kind='shared' - אירוע לכולם/משפחתי מתנגש באירוע משותף שכבר קיים באותו זמן
const ConflictDialog = ({ conflict, onClose }) => {
  const { kind, items } = conflict;
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal" onClick={onClose}>
      <div
        className="modal__box"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
        aria-describedby="conflict-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal__icon" aria-hidden="true">⛔</p>
        <h2 id="conflict-title" className="modal__title">לא ניתן לבצע את ההזמנה</h2>
        {kind === 'busy' ? (
          <>
            <p id="conflict-desc" className="modal__text">
              {items.length === 1 ? 'לאדם שאתה מנסה להזמין' : 'לאנשים שאתה מנסה להזמין'} כבר יש אירוע בלו״ז בזמן הזה:
            </p>
            <ul className="modal__list">
              {items.map((b) => (
                <li key={b.id}>
                  <strong>{b.name}</strong> · תפוס/ה ב-<span dir="ltr">{b.times.join(', ')}</span>
                </li>
              ))}
            </ul>
            <p className="modal__hint">אפשר לבחור שעה אחרת לאירוע, או להזמין מישהו אחר.</p>
          </>
        ) : (
          <>
            <p id="conflict-desc" className="modal__text">
              בזמן הזה כבר קיים אירוע שכולל את האנשים שאתה מנסה להזמין:
            </p>
            <ul className="modal__list">
              {items.map((c) => (
                <li key={c.id}>
                  <strong>{c.title || c.group}</strong>
                  {c.title && ` (${c.group})`} · <span dir={c.when === 'יום שלם' ? undefined : 'ltr'}>{c.when}</span>
                </li>
              ))}
            </ul>
            <p className="modal__hint">אפשר לבחור שעה אחרת לאירוע.</p>
          </>
        )}
        <button ref={closeRef} type="button" className="btn btn--primary btn--block" onClick={onClose}>
          הבנתי
        </button>
      </div>
    </div>
  );
};

export default Schedule;
