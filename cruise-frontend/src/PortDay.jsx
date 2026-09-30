import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from './api';
import { mapsUrl } from './eventTypes';
import { at } from './tripDays';

const MINUTE = 60 * 1000;
const REFRESH = 60 * 1000; // רענון כל דקה, כדי לראות מי עוד חזר

const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

// נתוני יום הנמל מהשרת (ובלי אינטרנט מהעותק השמור), עם רענון כל דקה
const usePortDay = (date) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => api.get(`/port-day/${date}`).then((res) => setData(res.data)).catch(() => {}), [date]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH);
    return () => clearInterval(id);
  }, [load]);

  const send = async (path, body) => {
    setError('');
    try {
      const res = await api.put(`/port-day/${date}/${path}`, body);
      setData(res.data);
      return true;
    } catch (err) {
      setError(errorMessage(err, 'לא הצלחנו לשמור. צריך חיבור לאינטרנט כדי לעדכן.'));
      return false;
    }
  };

  return { data, error, send };
};

const MeetingPoint = ({ meeting, readOnly, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [place, setPlace] = useState('');
  const [time, setTime] = useState('');

  const open = () => {
    setPlace(meeting?.place || '');
    setTime(meeting?.time || '');
    setEditing(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (await onSave({ place, time })) setEditing(false);
  };

  return (
    <div className="meeting">
      <h3 className="meeting__title">📍 נקודת מפגש</h3>
      {editing ? (
        <form className="meeting__form" onSubmit={submit}>
          <label className="visually-hidden" htmlFor="meeting-place">מקום</label>
          <input
            id="meeting-place"
            className="input"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="למשל: תחנת הרכבל העליונה בפירה"
            maxLength={120}
            autoFocus
          />
          <label className="visually-hidden" htmlFor="meeting-time">שעה</label>
          <input id="meeting-time" className="input meeting__time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <div className="meeting__actions">
            <button type="submit" className="btn btn--sm btn--primary">שמירה לכולם</button>
            <button type="button" className="btn btn--sm btn--outline" onClick={() => setEditing(false)}>ביטול</button>
          </div>
        </form>
      ) : meeting ? (
        <>
          <p className="meeting__place">
            <strong>{meeting.place}</strong>
            {meeting.time && <> · <span dir="ltr">{meeting.time}</span></>}
          </p>
          <p className="meeting__meta">
            <a href={mapsUrl(meeting.place)} target="_blank" rel="noreferrer">ניווט ב-Google Maps</a>
            {' · '}עדכן/ה: {meeting.updatedBy}
            {!readOnly && <> · <button type="button" className="link-btn" onClick={open}>שינוי</button></>}
          </p>
        </>
      ) : (
        <p className="meeting__meta">
          עוד לא נקבעה נקודת מפגש להיום.
          {!readOnly && <> <button type="button" className="link-btn" onClick={open}>לקבוע נקודת מפגש</button></>}
        </p>
      )}
    </div>
  );
};

// מי כבר חזר לספינה. שעה לפני שעת החזרה, מי שעוד לא סימן מודגש באדום
const Aboard = ({ day, now, data, readOnly, onMark }) => {
  const { me, people, families } = data;
  const mine = people.find((p) => p.id === me);
  const myFamily = mine?.family ? people.filter((p) => p.family === mine.family) : [];
  const familyMissing = myFamily.filter((p) => !p.aboard);
  const back = people.filter((p) => p.aboard).length;
  const urgent = day.boardBy && now >= at(day, day.boardBy) - 60 * MINUTE && now < at(day, day.depart);

  // קבוצות לפי משפחה, ומי שלא שויך למשפחה בסוף
  const groups = [...Object.keys(families), null]
    .map((f) => ({ key: f ?? 'other', label: f ? families[f] : 'נוסעים נוספים', people: people.filter((p) => p.family === f) }))
    .filter((g) => g.people.length);

  return (
    <div className="aboard">
      <h3 className="aboard__title">
        🚢 מי כבר על הספינה <span className="aboard__count">{back}/{people.length}</span>
      </h3>

      {!readOnly && mine && (
        <div className="aboard__actions">
          <button
            type="button"
            className={mine.aboard ? 'btn btn--sm btn--outline' : 'btn btn--gold'}
            onClick={() => onMark([me], !mine.aboard)}
          >
            {mine.aboard ? 'ביטול: אני עוד לא על הספינה' : '✓ אני על הספינה'}
          </button>
          {familyMissing.length > 0 && myFamily.length > 1 && (
            <button type="button" className="btn btn--sm btn--outline" onClick={() => onMark(familyMissing.map((p) => p.id), true)}>
              ✓ כל {families[mine.family]} על הספינה
            </button>
          )}
        </div>
      )}

      {groups.map((g) => (
        <div key={g.key} className="aboard__group">
          <h4 className="aboard__family">{g.label}</h4>
          <ul className="aboard__list">
            {g.people.map((p) => (
              <li key={p.id} className={p.aboard ? 'aboard__person aboard__person--back' : urgent ? 'aboard__person aboard__person--late' : 'aboard__person'}>
                <span className="aboard__mark" aria-hidden="true">{p.aboard ? '✓' : urgent ? '!' : '·'}</span>
                <span className="aboard__name">{p.name}</span>
                <span className="aboard__status">
                  {p.aboard
                    ? `על הספינה מ-${timeOf(p.aboard.at)}${p.aboard.by && p.aboard.by !== p.name ? ` (סימן/ה: ${p.aboard.by})` : ''}`
                    : 'עוד לא סימן/ה'}
                </span>
                {!readOnly && p.aboard && p.id !== me && (
                  <button type="button" className="link-btn aboard__undo" onClick={() => onMark([p.id], false)} aria-label={`ביטול הסימון של ${p.name}`}>
                    ביטול
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="field__hint">
        מופיעים רק נוסעים עם חשבון באתר. אפשר לסמן גם בני משפחה, למשל ילדים שחזרו איתך.
      </p>
    </div>
  );
};

const PortDay = ({ day, now, preview }) => {
  const { data, error, send } = usePortDay(day.date);
  if (!data) return null;

  return (
    <section className="today__section port-day" aria-label="חזרה לספינה ונקודת מפגש">
      <MeetingPoint meeting={data.meeting} readOnly={preview} onSave={(m) => send('meeting', m)} />
      <Aboard day={day} now={now} data={data} readOnly={preview} onMark={(userIds, aboard) => send('aboard', { userIds, aboard })} />
      {error && <p className="alert alert--error" role="alert">{error}</p>}
    </section>
  );
};

export default PortDay;
