import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { findCabin } from './cabins';
import { useUser } from './session';

// כל הזמנים בשעון רומא (CEST, UTC+2), כך שהספירה נכונה מכל מקום
const cruise = {
  target: new Date('2027-08-15T15:00:00+02:00').getTime(), // שעת ההפלגה לפי לוח ההפלגות
  dateLabel: '15.08.2027',
};

// id = מפתח המשפחה (כמו ב-family.js); family = השם שמוצג
const flights = [
  {
    id: 'singer',
    family: 'משפחת זינגר',
    flight: 'LY385',
    label: 'טיסת הבוקר',
    departs: '06:05',
    lands: '08:45',
    target: new Date('2027-08-12T08:45:00+02:00').getTime(),
  },
  {
    id: 'agayev',
    family: 'משפחת עגייב',
    flight: 'LY383',
    label: 'טיסת הערב',
    departs: '18:25',
    lands: '21:05',
    target: new Date('2027-08-12T21:05:00+02:00').getTime(),
  },
];

const DAY = 1000 * 60 * 60 * 24;

const split = (target, now) => {
  const distance = Math.max(target - now, 0);
  return {
    done: distance === 0,
    days: Math.floor(distance / DAY),
    hours: Math.floor((distance % DAY) / (1000 * 60 * 60)),
    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((distance % (1000 * 60)) / 1000),
  };
};

const pad = (n) => String(n).padStart(2, '0');

const units = (t) => [
  { value: t.days, label: 'ימים' },
  { value: pad(t.hours), label: 'שעות' },
  { value: pad(t.minutes), label: 'דקות' },
  { value: pad(t.seconds), label: 'שניות' },
];

const Countdown = () => {
  // שעון אחד משותף לכל הטיימרים. חישוב מיידי כדי שלא יוצגו אפסים בשנייה הראשונה
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= cruise.target) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const user = useUser();
  const cabin = findCabin(user);
  // כל משפחה רואה רק את הטיסה שלה (המשפחה נקבעת בשרת)
  const myFamily = user?.family;
  const myFlight = myFamily && flights.find((f) => f.id === myFamily);
  const cruiseLeft = split(cruise.target, now);

  return (
    <div>
      <article className="pass" aria-labelledby="pass-title">
        <div className="pass__main">
          <div className="pass__route">
            <span>רומא</span>
            <span className="pass__route-line" aria-hidden="true" />
            <span aria-hidden="true">🚢</span>
            <span className="pass__route-line" aria-hidden="true" />
            <span>הים התיכון</span>
          </div>

          <h1 id="pass-title" className="pass__title">Odyssey of the Seas</h1>
          <p className="pass__subtitle">
            {cruiseLeft.done ? 'אנחנו בים! הפלגה נעימה 🌊' : 'הספירה לאחור להפלגה שלנו כבר התחילה'}
          </p>

          {/* המספרים מתעדכנים כל שנייה - מוסתרים מקוראי מסך, עם סיכום קבוע במקומם */}
          <ul className="timer" aria-hidden="true">
            {units(cruiseLeft).map((u) => (
              <li key={u.label} className="timer__unit">
                <span className="timer__value">{u.value}</span>
                <span className="timer__label">{u.label}</span>
              </li>
            ))}
          </ul>
          <p className="visually-hidden">
            נותרו {cruiseLeft.days} ימים ו-{cruiseLeft.hours} שעות עד ההפלגה.
          </p>
        </div>

        <aside className="pass__stub" aria-label="פרטי ההפלגה">
          <dl>
            <div className="pass__field">
              <dt>תאריך הפלגה</dt>
              <dd>{cruise.dateLabel}</dd>
            </div>
            <div className="pass__field">
              <dt>נמל</dt>
              <dd>Civitavecchia</dd>
            </div>
            <div className="pass__field">
              <dt>אונייה</dt>
              <dd>Odyssey of the Seas</dd>
            </div>
            <div className="pass__field">
              <dt>החדר שלך</dt>
              <dd>{cabin ? `${cabin.number} · ${cabin.type}` : 'ייקבע בהמשך'}</dd>
            </div>
          </dl>
        </aside>
      </article>

      <section className="flights" aria-labelledby="flights-title">
        <h2 id="flights-title" className="flights__title">✈️ הטיסה שלך לרומא · 12.08.2027</h2>
        {!myFlight && (
          <p className="flights__note">
            {user ? 'לא מצאנו טיסה שמשויכת לשם המשפחה שלך.' : 'התחבר כדי לראות את הטיימר לטיסה שלך.'}
          </p>
        )}
        <div className="flights__grid">
          {[myFlight].filter(Boolean).map((f) => {
            const left = split(f.target, now);
            return (
              <article key={f.id} className="flight flight--mine">
                <header className="flight__head">
                  <div>
                    <h3 className="flight__family">{f.family}</h3>
                    <p className="flight__meta">
                      אל על <span dir="ltr">{f.flight}</span> · {f.label}
                    </p>
                  </div>
                </header>

                <p className="flight__times">
                  <span>המראה <strong dir="ltr">{f.departs}</strong></span>
                  <span className="flight__line" aria-hidden="true" />
                  <span>נחיתה <strong dir="ltr">{f.lands}</strong></span>
                </p>

                {left.done ? (
                  <p className="flight__done">נחתו ברומא! 🎉</p>
                ) : (
                  <>
                    <ul className="timer timer--small" aria-hidden="true">
                      {units(left).map((u) => (
                        <li key={u.label} className="timer__unit">
                          <span className="timer__value">{u.value}</span>
                          <span className="timer__label">{u.label}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="visually-hidden">
                      נותרו {left.days} ימים ו-{left.hours} שעות עד הנחיתה של {f.family}.
                    </p>
                  </>
                )}
              </article>
            );
          })}
        </div>
        {myFlight && <p className="flights__note">שעות לפי לוח הטיסות הנוכחי של אל על, בשעון המקומי. כדאי לוודא מול כרטיס הטיסה.</p>}
      </section>

      <nav className="quick-links" aria-label="קיצורי דרך">
        <Link to="/cabin-checklist" className="quick-link"><span aria-hidden="true">📋</span>צ'ק ליסט חדר</Link>
        <Link to="/personal-checklist" className="quick-link"><span aria-hidden="true">🎒</span>מה לארוז</Link>
        <Link to="/rome-guide" className="quick-link"><span aria-hidden="true">🏛️</span>מדריך לרומא</Link>
        <Link to="/itinerary" className="quick-link"><span aria-hidden="true">🗺️</span>המסלול שלנו</Link>
      </nav>
    </div>
  );
};

export default Countdown;
