import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from './api';
import Flag from './Flag';
import Weather from './Weather';
import TravelWarning from './TravelWarning';
import PortDay from './PortDay';
import { TodayPlan, TodayTasks } from './TodayPlan';
import { RSVP_LABELS, formatWhen, categoryIcon } from './eventTypes';
import { getToken } from './session';
import { at, clockAt, tzMinutes } from './tripDays';

const MINUTE = 60 * 1000;

// "3 שעות ו-12 דקות" / "40 דקות"
const formatLeft = (ms) => {
  const total = Math.max(Math.ceil(ms / MINUTE), 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hours = h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : `${h} שעות`;
  const minutes = m === 1 ? 'דקה' : `${m} דקות`;
  if (!h) return minutes;
  return m ? `${hours} ו-${minutes}` : hours;
};

const placeIcon = (d) => (d.country ? <Flag code={d.country} /> : <span aria-hidden="true">{d.emoji}</span>);

const shipTimes = (d) => {
  if (d.arrive && d.depart) return `${d.arrive}–${d.depart}`;
  if (d.depart) return `הפלגה ${d.depart}`;
  if (d.arrive) return `הגעה ${d.arrive}`;
  return null;
};

// מה המצב של הספינה עכשיו: מתי מגיעים, עד מתי חוזרים, או שכבר הפלגנו
const shipStatus = (d, now) => {
  const arrive = d.arrive && at(d, d.arrive);
  const depart = d.depart && at(d, d.depart);
  const boardBy = d.boardBy && at(d, d.boardBy);
  const toBoard = d.boardByLabel || 'ל-All Aboard';

  if (arrive && now < arrive) {
    return { tone: 'info', title: `הספינה מגיעה ב-${d.arrive}`, detail: `בעוד ${formatLeft(arrive - now)}` };
  }
  if (boardBy && now < boardBy) {
    const left = boardBy - now;
    return {
      tone: left <= 60 * MINUTE ? 'urgent' : 'ok',
      title: `${d.boardVerb || 'חוזרים'} לספינה עד ${d.boardBy}`,
      detail: `נותרו ${formatLeft(left)} ${toBoard} · ההפלגה ב-${d.depart}`,
    };
  }
  if (depart && now < depart) {
    return { tone: 'urgent', title: `הספינה מפליגה ב-${d.depart}`, detail: 'כולם צריכים להיות כבר על הספינה.' };
  }
  if (depart) return { tone: 'info', title: 'הפלגנו! 🌊', detail: `יצאנו מ${d.place} ב-${d.depart}` };
  if (arrive) return { tone: 'info', title: `הגענו ב-${d.arrive}`, detail: null };
  return null;
};

const clockIn = (now, timeZone) =>
  new Intl.DateTimeFormat('he-IL', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
const israelClock = (now) => clockIn(now, 'Asia/Jerusalem');
const phoneClock = (now) => clockIn(now, undefined);

const CRUISE_START = '2027-08-15';
const hoursText = (h) => (Math.abs(h) === 1 ? 'שעה' : Math.abs(h) === 2 ? 'שעתיים' : `${Math.abs(h)} שעות`);

// שעון הספינה בכל יום, משותף לכל המשפחות (נשמר בשרת, ובלי אינטרנט מהעותק השמור).
// יום שלא עודכן = כמו השעה המקומית
const useShipClock = () => {
  const [days, setDays] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) return undefined;
    let alive = true;
    api.get('/ship-clock')
      .then((res) => alive && setDays(res.data.days))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const save = async (date, shift) => {
    setError('');
    try {
      const res = await api.put(`/ship-clock/${date}`, { shift });
      setDays(res.data.days);
      return true;
    } catch (err) {
      setError(errorMessage(err, 'לא הצלחנו לשמור. צריך חיבור לאינטרנט כדי לעדכן.'));
      return false;
    }
  };

  return { days, save, error };
};

// השעון המקומי, שעון הספינה ושעון ישראל. אזהרה אם השעון בטלפון לא תואם לאף אחד מהם,
// והודעה ביום שבלילה שאחריו מזיזים את השעון
const Clocks = ({ day, next, now, preview }) => {
  const { days, save, error } = useShipClock();
  const [editing, setEditing] = useState(false);

  const onShip = day.date >= CRUISE_START;
  const ship = onShip ? days[day.date] : null;
  const shipShift = ship?.shift || 0;
  const local = clockAt(now, day.tz);
  const shipTime = clockAt(now + shipShift * 60 * MINUTE, day.tz);

  // בטלפון: getTimezoneOffset הפוך בסימן (UTC+3 -> -180). בתצוגה מקדימה השעה מדומה, אז לא משווים.
  // אם הטלפון מראה את שעון הספינה (למשל כשהוא מחובר לרשת של הספינה), זה בסדר
  const phoneMinutes = -new Date(now).getTimezoneOffset();
  const phoneOff = !preview && !day.sea
    && phoneMinutes !== tzMinutes(day.tz)
    && phoneMinutes !== tzMinutes(day.tz) + shipShift * 60;
  const tonight = next ? (tzMinutes(next.tz) - tzMinutes(day.tz)) / 60 : 0;

  const choose = async (shift) => {
    if (await save(day.date, shift)) setEditing(false);
  };

  return (
    <>
      <p className="today__clocks">
        {!day.sea && <span>🕐 כאן: <strong dir="ltr">{local}</strong></span>}
        {onShip && <span>🚢 בספינה: <strong dir="ltr">{shipTime}</strong></span>}
        <span><Flag code="il" /> בישראל: <strong dir="ltr">{israelClock(now)}</strong></span>
      </p>

      {onShip && (
        <div className="ship-clock">
          <p className="ship-clock__text">
            {shipShift === 0
              ? 'שעון הספינה כמו השעה המקומית.'
              : `הספינה ${hoursText(shipShift)} ${shipShift > 0 ? 'קדימה' : 'אחורה'} מהשעה המקומית${ship.updatedBy ? ` (עדכן/ה: ${ship.updatedBy})` : ''}. שעת החזרה לספינה בתוכנייה היומית היא לפי שעון הספינה.`}
            {getToken() && !preview && (
              <>
                {' '}
                <button type="button" className="link-btn" onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
                  {editing ? 'סגירה' : shipShift === 0 ? 'הספינה בשעה אחרת?' : 'עדכון'}
                </button>
              </>
            )}
          </p>
          {editing && (
            <div className="ship-clock__edit">
              <p className="field__hint">לפי התוכנייה היומית של הספינה. העדכון לכל המשפחות, ורק ליום הזה.</p>
              <div className="ship-clock__options" role="group" aria-label="שעון הספינה ביחס לשעה המקומית">
                {[-1, 0, 1].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={s === shipShift ? 'btn btn--sm btn--primary' : 'btn btn--sm btn--outline'}
                    aria-pressed={s === shipShift}
                    onClick={() => choose(s)}
                  >
                    {s === 0 ? 'כמו המקומית' : `${hoursText(s)} ${s > 0 ? 'קדימה' : 'אחורה'}`}
                  </button>
                ))}
              </div>
              {error && <p className="alert alert--error" role="alert">{error}</p>}
            </div>
          )}
        </div>
      )}

      {phoneOff && (
        <p className="today__note today__note--warn">
          ⚠️ השעון בטלפון מראה <span dir="ltr">{phoneClock(now)}</span>,
          אבל השעה המקומית כאן היא <span dir="ltr">{local}</span>
          {shipShift !== 0 && <> ושעון הספינה <span dir="ltr">{shipTime}</span></>}.
          {' '}השעות באתר הן לפי השעה המקומית.
        </p>
      )}
      {tonight !== 0 && (
        <p className="today__note">
          🕐 הלילה מזיזים את השעון {hoursText(tonight)} {tonight > 0 ? 'קדימה' : 'אחורה'}.
          {' '}הספינה מודיעה על כך בתוכנייה היומית, וכדאי לבדוק שהשעון בטלפון התעדכן בבוקר.
        </p>
      )}
    </>
  );
};

// האירועים של היום מהלו״ז (נטען מהשרת, ובלי אינטרנט מהעותק השמור)
const useTodayEvents = (date) => {
  const [state, setState] = useState(getToken() ? { status: 'loading', events: [] } : { status: 'guest', events: [] });

  useEffect(() => {
    if (!getToken()) return undefined;
    let alive = true;
    api.get('/events')
      .then((res) => {
        if (!alive) return;
        const events = res.data.events
          .filter((ev) => ev.date === date)
          .sort((a, b) => (a.allDay === b.allDay ? (a.time || '').localeCompare(b.time || '') : a.allDay ? -1 : 1));
        setState({ status: 'ready', events });
      })
      .catch((err) => alive && setState({ status: err.response?.status === 401 ? 'guest' : 'error', events: [] }));
    return () => {
      alive = false;
    };
  }, [date]);

  return state;
};

const Today = ({ day, next, now, preview }) => {
  const status = shipStatus(day, now);
  const times = shipTimes(day);
  const { status: evStatus, events } = useTodayEvents(day.date);

  return (
    <article className="today" aria-labelledby="today-title">
      {preview && (
        <p className="today__preview">
          👀 תצוגה מקדימה של מסך ״היום״ · {day.date.split('-').reverse().slice(0, 2).join('.')}{' '}
          <Link to="/">חזרה לספירה לאחור</Link>
        </p>
      )}

      <header className="today__head">
        <p className="today__kicker">היום · {day.weekday} {day.date.split('-').reverse().slice(0, 2).join('.')} · {day.kicker}</p>
        <h1 id="today-title" className="today__place">
          {placeIcon(day)} {day.place}
        </h1>
        {times && (
          <p className="today__times">
            🚢 {day.arrive && day.depart ? 'הספינה בנמל: ' : day.depart ? 'ההפלגה יוצאת ב-' : 'הספינה מגיעה ב-'}
            <span dir="ltr" className="today__nowrap">{day.arrive && day.depart ? times : day.depart || day.arrive}</span>
          </p>
        )}
        {day.weather && <Weather id={day.weather} date={day.date} compact />}
      </header>

      <Clocks day={day} next={next} now={now} preview={preview} />

      {status && (
        <div className={`today__status today__status--${status.tone}`} role="status">
          <strong className="today__status-title">{status.title}</strong>
          {status.detail && <span>{status.detail}</span>}
        </div>
      )}

      {day.boardBy && getToken() && <PortDay day={day} now={now} preview={preview} />}

      {day.country && <TravelWarning country={day.country} compact onlyHigh />}

      {day.note && <p className="today__note">💡 {day.note}</p>}

      {getToken() && <TodayPlan day={day} />}
      {getToken() && <TodayTasks day={day} preview={preview} />}

      <section className="today__section" aria-labelledby="today-events">
        <h2 id="today-events" className="today__subtitle">📅 מה בלו״ז היום</h2>
        {evStatus === 'guest' && <p className="today__empty"><Link to="/login">התחבר</Link> כדי לראות את האירועים של היום.</p>}
        {evStatus === 'loading' && <p className="today__empty">טוען…</p>}
        {evStatus === 'error' && <p className="today__empty">לא הצלחנו לטעון את הלו״ז כרגע.</p>}
        {evStatus === 'ready' && events.length === 0 && (
          <p className="today__empty">אין אירועים בלו״ז להיום. <Link to="/schedule">להוספת אירוע</Link></p>
        )}
        {events.length > 0 && (
          <ul className="today__events">
            {events.map((ev) => (
              <li key={ev.id}>
                <Link to={`/schedule/${ev.id}`} className={`today__event event--${ev.type}`}>
                  <span className="today__event-time" dir={ev.allDay ? undefined : 'ltr'}>{formatWhen(ev)}</span>
                  <span className="today__event-title">
                    {categoryIcon(ev) && <span aria-hidden="true">{categoryIcon(ev)} </span>}
                    {ev.title}
                    {ev.location && <span className="today__event-where">📍 {ev.location}</span>}
                  </span>
                  <span className="today__event-rsvp" title="אישור ההגעה שלי">
                    {ev.myRsvp ? RSVP_LABELS[ev.myRsvp].icon : '•'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav className="today__links" aria-label="קיצורי דרך להיום">
        <Link to={day.guide.to} className="btn btn--gold">{day.guide.label}</Link>
        <Link to="/schedule" className="btn btn--outline">📅 הלו״ז המלא</Link>
        <Link to="/itinerary" className="btn btn--outline">🗺️ המסלול</Link>
      </nav>

      {next && (
        <p className="today__next">
          <span className="today__next-label">מחר ({next.weekday}):</span> {placeIcon(next)} {next.place}
          {shipTimes(next) && <> · <span dir="ltr" className="today__nowrap">{shipTimes(next)}</span></>}
        </p>
      )}

      <p className="today__fineprint">
        השעות בשעון המקומי, לפי לוח ההפלגות. השעות הסופיות מופיעות בתוכנייה היומית של הספינה ובאפליקציה של Royal Caribbean.
      </p>
    </article>
  );
};

export default Today;
