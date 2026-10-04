import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errorMessage } from './api';
import { CATEGORIES, EVENT_TYPES, emptyForm, formatDate } from './eventTypes';

// טופס אירוע, ליצירה (בלו״ז) ולעריכה (בדף האירוע). eventId קיים רק בעריכה.
// people: התשובה מ-/events/people (מוזמנים אפשריים, המשפחה שלי וטווח התאריכים)
const EventForm = ({ people, initial = emptyForm, eventId = null, submitLabel, onSaved }) => {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(null);
  const [conflict, setConflict] = useState(null);
  const closeConflict = useCallback(() => setConflict(null), []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // הסרת מוזמן מיידית; הוספת מוזמן רק אחרי שבודקים שהוא פנוי בזמן הזה
  const toggleInvitee = async (id) => {
    if (form.invitees.includes(id)) {
      setForm((f) => ({ ...f, invitees: f.invitees.filter((x) => x !== id) }));
      return;
    }
    setChecking(id);
    try {
      const { date, allDay, time, endTime } = form;
      const res = await api.post('/events/availability', { date, allDay, time, endTime, userIds: [id], exceptId: eventId });
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
      const res = eventId ? await api.put(`/events/${eventId}`, form) : await api.post('/events', form);
      onSaved(res.data.id);
    } catch (err) {
      // בין הבחירה לשליחה אפשר לשנות תאריך/שעה, אז השרת בודק שוב
      const data = err.response?.data;
      if (data?.code === 'INVITEE_BUSY') setConflict({ kind: 'busy', items: data.busy });
      else if (data?.code === 'SHARED_CONFLICT') setConflict({ kind: 'shared', items: data.clashes });
      else setError(data?.message || (eventId ? 'שמירת השינויים נכשלה. נסה שוב.' : 'יצירת האירוע נכשלה. נסה שוב.'));
      setSaving(false);
    }
  };

  const myFamilyLabel = people?.me.family ? people.families[people.me.family] : null;
  const range = people?.range || { min: '2027-07-29', max: '2027-08-22' };
  const others = people?.people.filter((p) => p.id !== people.me.id) || [];

  return (
    <>
      <form className="event-form" onSubmit={submit}>
        {error && <p className="alert alert--error" role="alert">{error}</p>}

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

        <fieldset className="category-picker">
          <legend className="field__label">מה זה?</legend>
          {Object.entries(CATEGORIES).map(([key, c]) => (
            <label key={key} className={`category-option${form.category === key ? ' is-on' : ''}`}>
              <input type="radio" name="category" value={key} checked={form.category === key} onChange={update('category')} />
              <span>{c.icon} {c.label}</span>
            </label>
          ))}
        </fieldset>

        {form.category !== 'general' && (
          <div className="field">
            <label className="field__label" htmlFor="ev-confirmation">מספר אישור ההזמנה (לא חובה)</label>
            <input
              id="ev-confirmation"
              className="input"
              dir="ltr"
              maxLength={60}
              placeholder="מהאפליקציה של Royal Caribbean"
              value={form.confirmation}
              onChange={update('confirmation')}
            />
          </div>
        )}

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
          {saving ? 'שומר…' : submitLabel || (eventId ? 'שמירת השינויים' : 'יצירת האירוע')}
        </button>
      </form>

      {conflict && <ConflictDialog conflict={conflict} onClose={closeConflict} />}
    </>
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

export default EventForm;
