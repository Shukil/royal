import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from './api';
import Flag from './Flag';
import { getToken } from './session';
import { checkItem, dayLabel, planDays } from './planChecks';
import { findTripDay } from './tripDays';

const emptyForm = { start: '10:00', end: '', title: '', who: '', booked: false, note: '', link: '' };

const shipLine = (d) => {
  const parts = [];
  if (d.arrive) parts.push(`הספינה מגיעה ${d.arrive}`);
  if (d.boardBy) parts.push(`${d.boardVerb === 'עולים' ? 'סגירת הצ׳ק-אין' : 'חוזרים לספינה עד'} ${d.boardBy}`);
  if (d.depart) parts.push(`הפלגה ${d.depart}`);
  return parts.join(' · ');
};

// פריט אחד בתוכנית: שעות, מה, מי, האם הוזמן, ובעיות מול שעות הספינה
export const PlanItemView = ({ item, day, actions }) => {
  const issues = checkItem(item, day);
  return (
    <li className={`plan-item${issues.some((i) => i.level === 'error') ? ' plan-item--error' : ''}`}>
      <span className="plan-item__time" dir="ltr">{item.start}{item.end && `–${item.end}`}</span>
      <div className="plan-item__body">
        <p className="plan-item__title">
          {item.title}
          <span className={item.booked ? 'plan-badge plan-badge--ok' : 'plan-badge'}>{item.booked ? '✓ הוזמן' : '🎟️ צריך להזמין'}</span>
        </p>
        {item.who && <p className="plan-item__meta">👥 {item.who}</p>}
        {item.note && <p className="plan-item__meta">{item.note}</p>}
        {item.link && (
          <p className="plan-item__meta">
            <a href={item.link} target="_blank" rel="noreferrer" dir="ltr">🔗 {new URL(item.link).hostname}</a>
          </p>
        )}
        {issues.map((i) => (
          <p key={i.text} className={`plan-issue plan-issue--${i.level}`}>{i.level === 'error' ? '❌' : '⚠️'} {i.text}</p>
        ))}
        {actions}
      </div>
    </li>
  );
};

const ItemForm = ({ initial, onSave, onCancel, busy }) => {
  const [form, setForm] = useState(initial);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <form
      className="plan-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <label className="field plan-form__title">
        <span className="field__label">מה עושים</span>
        <input className="input" value={form.title} onChange={set('title')} maxLength={120} required placeholder="למשל: מעבורת לקאפרי" />
      </label>
      <label className="field">
        <span className="field__label">מ-</span>
        <input className="input" type="time" value={form.start} onChange={set('start')} required />
      </label>
      <label className="field">
        <span className="field__label">עד (לא חובה)</span>
        <input className="input" type="time" value={form.end} onChange={set('end')} />
      </label>
      <label className="field plan-form__wide">
        <span className="field__label">מי מצטרף (לא חובה)</span>
        <input className="input" value={form.who} onChange={set('who')} maxLength={80} placeholder="כולם / משפחת זינגר / דנה ויוני" />
      </label>
      <label className="field plan-form__wide">
        <span className="field__label">הערה (לא חובה)</span>
        <input className="input" value={form.note} onChange={set('note')} maxLength={500} placeholder="למשל: המעבורת האחרונה חזרה ב-17:10" />
      </label>
      <label className="field plan-form__wide">
        <span className="field__label">קישור להזמנה (לא חובה)</span>
        <input className="input" type="url" dir="ltr" value={form.link} onChange={set('link')} maxLength={300} placeholder="https://" />
      </label>
      <label className="check-row plan-form__wide">
        <input type="checkbox" checked={form.booked} onChange={set('booked')} />
        <span>כבר הוזמן / יש כרטיסים</span>
      </label>
      <div className="plan-form__actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>שמירה</button>
        <button type="button" className="btn btn--outline btn--sm" onClick={onCancel}>ביטול</button>
      </div>
    </form>
  );
};

const Plan = () => {
  const [params, setParams] = useSearchParams();
  const [today] = useState(() => findTripDay(Date.now())?.day);
  const selected = planDays.find((d) => d.date === params.get('day'))
    ?? planDays.find((d) => d.date === today?.date)
    ?? planDays[0];

  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) return;
    api.get('/plan')
      .then((res) => setItems(res.data.items))
      .catch((err) => setError(errorMessage(err, 'לא הצלחנו לטעון את התוכנית.')));
  }, []);

  if (!getToken()) {
    return (
      <div className="page">
        <article className="card">
          <div className="card__body"><p className="empty"><Link to="/login">התחבר</Link> כדי לראות ולבנות את תוכנית הטיול.</p></div>
        </article>
      </div>
    );
  }

  const selectDay = (date) => {
    setEditing(null);
    setParams({ day: date }, { replace: true });
  };

  // התשובה מהשרת היא הפריטים של היום הזה בלבד, אז מחליפים רק אותם
  const save = async (request) => {
    setBusy(true);
    setError('');
    try {
      const res = await request();
      setItems((all) => [...all.filter((i) => i.date !== selected.date), ...res.data.items]);
      setEditing(null);
    } catch (err) {
      setError(errorMessage(err, 'לא הצלחנו לשמור. צריך חיבור לאינטרנט כדי לעדכן.'));
    } finally {
      setBusy(false);
    }
  };

  const dayItems = (items || []).filter((i) => i.date === selected.date).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="page page--wide">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">תוכנית הטיול 📋</h1>
          <p className="card__lead">מה עושים בכל יום, מי מצטרף ומה כבר הוזמן. התוכנית משותפת לכל המשפחות, והיא נבדקת מול שעות הספינה.</p>
        </header>

        <div className="card__body">
          <div className="plan-days" role="tablist" aria-label="ימי הטיול">
            {planDays.map((d) => {
              const list = (items || []).filter((i) => i.date === d.date);
              const open = list.filter((i) => !i.booked).length;
              const problems = list.some((i) => checkItem(i, d).length);
              return (
                <button
                  key={d.date}
                  type="button"
                  role="tab"
                  aria-selected={d.date === selected.date}
                  className="plan-day"
                  onClick={() => selectDay(d.date)}
                >
                  <span className="plan-day__date">{dayLabel(d)}</span>
                  <span className="plan-day__place">{d.country ? <Flag code={d.country} /> : d.emoji} {d.place}</span>
                  <span className="plan-day__meta">
                    {list.length ? `${list.length} פריטים` : 'ריק'}
                    {open > 0 && ` · ${open} להזמין`}
                    {problems && ' · ⚠️'}
                  </span>
                </button>
              );
            })}
          </div>

          <section className="plan-day-view" role="tabpanel" aria-label={`${dayLabel(selected)} · ${selected.place}`}>
            <header className="plan-day-view__head">
              <h2 className="section__title">{dayLabel(selected)} · {selected.place}</h2>
              {shipLine(selected) && <p className="plan-day-view__ship" dir="rtl">🚢 {shipLine(selected)}</p>}
              <Link to={selected.guide.to} className="port__link">{selected.guide.label} ←</Link>
            </header>

            {error && <p className="alert alert--error" role="alert">{error}</p>}
            {items === null && !error && <p className="empty">טוען…</p>}

            {items !== null && (
              <>
                {dayItems.length === 0 && editing !== 'new' && <p className="empty">עוד אין תוכנית ליום הזה.</p>}
                <ol className="plan-list">
                  {dayItems.map((item) =>
                    editing === item.id ? (
                      <li key={item.id} className="plan-item plan-item--editing">
                        <ItemForm
                          initial={item}
                          busy={busy}
                          onCancel={() => setEditing(null)}
                          onSave={(form) => save(() => api.put(`/plan/${selected.date}/${item.id}`, form))}
                        />
                      </li>
                    ) : (
                      <PlanItemView
                        key={item.id}
                        item={item}
                        day={selected}
                        actions={
                          <p className="plan-item__actions">
                            <button type="button" className="link-btn" onClick={() => setEditing(item.id)}>עריכה</button>
                            {' · '}
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => window.confirm(`למחוק את "${item.title}" מהתוכנית של כולם?`) && save(() => api.delete(`/plan/${selected.date}/${item.id}`))}
                            >
                              מחיקה
                            </button>
                            <span className="plan-item__by"> · עדכן/ה: {item.updatedBy}</span>
                          </p>
                        }
                      />
                    ),
                  )}
                </ol>

                {editing === 'new' ? (
                  <ItemForm
                    initial={emptyForm}
                    busy={busy}
                    onCancel={() => setEditing(null)}
                    onSave={(form) => save(() => api.post(`/plan/${selected.date}`, form))}
                  />
                ) : (
                  <button type="button" className="btn btn--gold btn--sm" onClick={() => setEditing('new')}>＋ הוספה לתוכנית</button>
                )}
              </>
            )}
          </section>
        </div>
      </article>
    </div>
  );
};

export default Plan;
