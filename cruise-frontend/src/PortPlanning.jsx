import { useEffect, useRef, useState } from 'react';
import { SHIP } from './portInfo';

// חלקי התכנון של יום נמל במדריכי היעדים (הנתונים ב-portInfo.js, השעות ב-tripDays.js)

const toMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// טווחים של מספרים או שעות ("08:00–20:00", "25–35 €") מתהפכים בתוך טקסט בעברית.
// עוטפים כל טווח כזה בכיוון שמאל-לימין, כדי שיוצג בסדר הנכון
const RANGE_RE = /(\d[\d:.,]*\s*[–-]\s*\d[\d:.,]*)/;
const Ltr = ({ text }) =>
  String(text).split(RANGE_RE).map((part, i) => (i % 2 ? <span key={i} dir="ltr">{part}</span> : part));

// ===== כרטיס לנהג המונית =====
// מראים לנהג את המסך: לאן לנסוע, בשפה המקומית ובאנגלית. במסך מלא הטקסט גדול, וקל להראות אותו מהמושב האחורי
export const DriverCard = ({ driver, day }) => {
  const [full, setFull] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!full) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && setFull(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [full]);

  const card = (
    <div className="driver-card__text" lang={driver.lang} dir="ltr">
      <p className="driver-card__ask">{driver.ask}</p>
      <p className="driver-card__place">{driver.place}</p>
      {driver.address && <p className="driver-card__address">{driver.address}</p>}
      <p className="driver-card__en" lang="en">{driver.askEn}<br />{driver.placeEn}</p>
      <p className="driver-card__ship" lang="en">
        {SHIP}{day?.depart && ` · departs ${day.depart}`}
      </p>
    </div>
  );

  return (
    <>
      <div className="driver-card">
        {card}
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setFull(true)}>
          📱 להראות לנהג במסך מלא
        </button>
      </div>
      <p className="field__hint"><Ltr text={driver.note} /></p>

      {full && (
        <div className="driver-card--full" role="dialog" aria-modal="true" aria-label="כרטיס לנהג">
          {card}
          <button ref={closeRef} type="button" className="btn btn--gold" onClick={() => setFull(false)}>סגירה</button>
        </div>
      )}
    </>
  );
};

// ===== כמה זמן באמת יש =====
// לכל מקום: עד מתי צריך לצאת ממנו כדי להגיע לספינה עם מרווח לפני ה-All Aboard
export const TimeBudget = ({ timing, day }) => {
  const boardBy = toMinutes(day.boardBy);
  const off = toMinutes(day.arrive) + timing.offFrom;
  const hoursAshore = ((boardBy - timing.margin - off) / 60).toFixed(1).replace('.0', '');

  return (
    <>
      <dl className="facts">
        <div className="fact">
          <dt>יורדים מהספינה בערך</dt>
          <dd dir="ltr">{toTime(off)}</dd>
        </div>
        <div className="fact">
          <dt>All Aboard (חוזרים עד)</dt>
          <dd dir="ltr">{day.boardBy}</dd>
        </div>
        <div className="fact">
          <dt>זמן אמיתי ביבשה</dt>
          <dd>כ-{hoursAshore} שעות</dd>
        </div>
      </dl>
      <p className="field__hint">
        הספינה עוגנת ב-{day.arrive}, אבל {timing.offWhy}. לפני ה-All Aboard משאירים {timing.margin} דקות ל{timing.marginWhy}.
      </p>

      <div className="table-wrap">
        <table className="metro time-budget">
          <thead>
            <tr>
              <th scope="col">מאיפה חוזרים</th>
              <th scope="col">לצאת עד</th>
            </tr>
          </thead>
          <tbody>
            {timing.trips.map((t) => (
              <tr key={t.from}>
                <td>
                  <strong>{t.from}</strong>
                  <span className="time-budget__how">{t.how}{t.back > 0 && ` · כ-${t.back} דק׳`}</span>
                  {t.note && <span className="time-budget__note"><Ltr text={t.note} /></span>}
                </td>
                <td className="time-budget__leave" dir="ltr">{toTime(boardBy - (t.margin ?? timing.margin) - t.back)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ===== כרטיסים ושעות =====
export const Tickets = ({ tickets, day }) => (
  <>
    <ul className="tickets">
      {tickets.map((t) => {
        const closedToday = t.closed?.includes(day?.weekday);
        return (
          <li key={t.name} className={`ticket${closedToday ? ' is-closed' : ''}`}>
            <div className="ticket__head">
              <strong>{t.name}</strong>
              {closedToday ? (
                <span className="plan-badge plan-badge--danger">סגור ביום {day.weekday} שלנו</span>
              ) : t.closed ? (
                <span className="plan-badge plan-badge--ok">פתוח ביום שלנו</span>
              ) : null}
            </div>
            <dl className="ticket__facts">
              <div><dt>מחיר</dt><dd><Ltr text={t.price} /></dd></div>
              {t.hours && <div><dt>שעות</dt><dd><Ltr text={t.hours} /></dd></div>}
              {t.closed && <div><dt>סגור</dt><dd>ימי {t.closed.join(', ')}</dd></div>}
              <div><dt>כרטיסים</dt><dd>{t.book}</dd></div>
            </dl>
            {t.url && (
              <a className="ticket__link" href={t.url} target="_blank" rel="noreferrer" dir="ltr">
                {t.url.replace('https://', '')} ↗
              </a>
            )}
          </li>
        );
      })}
    </ul>
    <p className="tip">מחירים ושעות לפי המידע הרשמי האחרון, והם משתנים משנה לשנה. כדאי לבדוק באתרים הרשמיים לפני הטיול.</p>
  </>
);

// ===== סיור של הספינה או לבד =====
const VERDICTS = {
  ship: { label: '🚢 מומלץ סיור של הספינה', className: 'ship-or-self--ship' },
  self: { label: '🚶 אפשר בקלות לבד', className: 'ship-or-self--self' },
  either: { label: '⚖️ תלוי מה רוצים לראות', className: 'ship-or-self--either' },
};

export const ShipOrSelf = ({ ship }) => {
  const v = VERDICTS[ship.verdict];
  return (
    <div className={`ship-or-self ${v.className}`}>
      <p className="ship-or-self__verdict">{v.label}</p>
      <p className="prose">{ship.summary}</p>
      <ul className="ship-or-self__points">
        {ship.points.map((p) => <li key={p}>{p}</li>)}
      </ul>
      <p className="field__hint">
        הכלל החשוב: הספינה מחכה לסיורים שלה אם הם מתעכבים, אבל לא למי שיצא לבד. את הסיורים מזמינים באפליקציה של Royal Caribbean.
      </p>
    </div>
  );
};
