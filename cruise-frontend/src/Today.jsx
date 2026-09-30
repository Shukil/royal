import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import Flag from './Flag';
import Weather from './Weather';
import TravelWarning from './TravelWarning';
import { RSVP_LABELS, formatWhen } from './eventTypes';
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

// שעון מקומי מול שעון ישראל, אזהרה אם השעון בטלפון לא תואם לשעה המקומית,
// והודעה ביום שבלילה שאחריו מזיזים את השעון
const Clocks = ({ day, next, now, preview }) => {
  const local = clockAt(now, day.tz);
  // בטלפון: getTimezoneOffset הפוך בסימן (UTC+3 -> -180). בתצוגה מקדימה השעה מדומה, אז לא משווים
  const phoneOff = !preview && !day.sea && -new Date(now).getTimezoneOffset() !== tzMinutes(day.tz);
  const shift = next ? (tzMinutes(next.tz) - tzMinutes(day.tz)) / 60 : 0;

  return (
    <>
      <p className="today__clocks">
        <span>🕐 כאן: <strong dir="ltr">{local}</strong></span>
        <span><Flag code="il" /> בישראל: <strong dir="ltr">{israelClock(now)}</strong></span>
      </p>
      {phoneOff && (
        <p className="today__note today__note--warn">
          ⚠️ השעון בטלפון מראה <span dir="ltr">{phoneClock(now)}</span>,
          אבל השעה המקומית כאן היא <span dir="ltr">{local}</span>. כל השעות באתר הן לפי השעה המקומית, וכדאי לוודא גם מול שעון הספינה.
        </p>
      )}
      {shift !== 0 && (
        <p className="today__note">
          🕐 הלילה מזיזים את השעון {Math.abs(shift) === 1 ? 'שעה' : `${Math.abs(shift)} שעות`} {shift > 0 ? 'קדימה' : 'אחורה'}.
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

      {day.country && <TravelWarning country={day.country} compact onlyHigh />}

      {day.note && <p className="today__note">💡 {day.note}</p>}

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
