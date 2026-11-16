import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Countdown from './Countdown';
import { findTripDay, useTripClock } from './tripDays';
import OdysseyInfo from './OdysseyInfo';
import { destinations, guideOrder } from './destinations';
import { photos } from './photos';

// מסך "היום" מוצג רק בימי הטיול עצמם, אז הוא (ואיתו התוכנית, המשימות ומזג האוויר) נטען רק אז
// ולא מכביד על הכניסה לאתר בשאר השנה
const Today = lazy(() => import('./Today'));

// רומא לא נמצאת ב-destinations (יש לה דף משלה), אז הפרטים שלה כאן
const rome = {
  id: 'rome',
  name: 'רומא',
  emoji: '🏛️',
  day: 'לפני ההפלגה · 12–15.08',
  lead: 'העיר הנצחית: הקולוסאום, הוותיקן והמזרקות, ומשם לנמל צ׳יוויטווקיה ולספינה',
  highlights: ['הקולוסאום', 'מזרקת טרווי', 'הוותיקן', 'הפנתאון'],
  port: 'נמל צ׳יוויטווקיה · הפלגה ב-15:00',
  photo: photos.rome.gallery[0],
  to: '/rome-guide',
};

const stops = [
  rome,
  ...guideOrder.map((id) => {
    const d = destinations[id];
    return {
      id,
      name: d.name,
      emoji: d.emoji,
      day: d.day,
      lead: d.lead,
      highlights: d.sites.slice(0, 4).map((s) => s.name),
      port: d.port.title,
      photo: photos[id].gallery[0],
      to: `/guide/${id}`,
    };
  }),
];
const photoOf = Object.fromEntries(stops.map((s) => [s.id, s.photo]));

// כל הסצנות לפי הסדר. לכל סצנה שכבת רקע משלה
const scenes = [
  { id: 'countdown', label: 'ספירה לאחור' },
  { id: 'odyssey', label: 'על האודיסי' },
  { id: 'guides', label: 'לאן מפליגים' },
  ...stops.map((s) => ({ id: s.id, label: s.name })),
];

const smoothstep = (x) => {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
};

const Home = () => {
  const [active, setActive] = useState('countdown');
  // תמונות הרקע של היעדים נטענות רק כשמתקרבים אליהן בגלילה (הסצנה הנוכחית והבאה אחריה),
  // כדי שהכניסה לדף לא תוריד את כולן בבת אחת
  const [reached, setReached] = useState(0);
  // בימי הטיול (12–22.08) החלק העליון מציג את מסך "היום" במקום הספירה לאחור
  const { now, preview } = useTripClock();
  const today = findTripDay(now);
  const root = useRef(null);
  const layers = useRef({});

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    document.documentElement.classList.add('home-snap');

    // מעבר צבעים רציף לפי מיקום הגלילה: סביב כל גבול בין סצנות יש אזור מעבר
    // ברוחב של כמעט מסך שלם, שבו השכבה הבאה מתגלה בהדרגה (smoothstep) מעל הקודמת
    // מיקומי הסצנות נמדדים פעם אחת (ושוב כשגובה הדף משתנה: שינוי גודל מסך, תמונות ונתונים שנטענים),
    // ולא בכל פריים של גלילה. כך בזמן הגלילה רק כותבים שקיפות לשכבות, בלי לכפות חישוב פריסה מחדש
    let frame = 0;
    let tops = [];
    const lastOpacity = [];
    const measure = () => {
      tops = scenes.map((s) => {
        const node = document.getElementById(`scene-${s.id}`);
        return node ? node.getBoundingClientRect().top + window.scrollY : null;
      });
    };
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const center = window.scrollY + vh / 2;
      const zone = vh * 0.9;
      let current = scenes[0].id;
      let currentIndex = 0;
      scenes.forEach((s, i) => {
        const top = tops[i];
        const layer = layers.current[s.id];
        if (top == null || !layer) return;
        if (center >= top) {
          current = s.id;
          currentIndex = i;
        }
        const opacity = i === 0 ? 1 : smoothstep((center - (top - zone / 2)) / zone);
        if (lastOpacity[i] === undefined || Math.abs(opacity - lastOpacity[i]) > 0.005) {
          layer.style.opacity = opacity;
          lastOpacity[i] = opacity;
        }
      });
      setActive(current);
      setReached((r) => Math.max(r, currentIndex));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const remeasure = () => {
      measure();
      schedule();
    };
    measure();
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', remeasure);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(remeasure);
    observer?.observe(el);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', remeasure);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      document.documentElement.classList.remove('home-snap');
    };
  }, []);

  const darkScene = active !== 'countdown';

  return (
    <div className="home" ref={root} data-dark={darkScene ? 'true' : undefined}>
      <div className="home__bg" aria-hidden="true">
        {scenes.map((s, i) => (
          <div
            key={s.id}
            ref={(node) => { layers.current[s.id] = node; }}
            className={`home__layer home__layer--${s.id}${photoOf[s.id] ? ' home__layer--photo' : ''}`}
            style={{
              opacity: i === 0 ? 1 : 0,
              backgroundImage: photoOf[s.id] && i <= reached + 1 ? `url("${photoOf[s.id].src}")` : undefined,
            }}
          />
        ))}
      </div>

      <nav className="scene-dots" aria-label="מעבר בין חלקי הדף">
        {scenes.map((s) => (
          <a
            key={s.id}
            href={`#scene-${s.id}`}
            className="scene-dots__dot"
            title={s.label}
            aria-label={s.label}
            aria-current={active === s.id ? 'true' : undefined}
          />
        ))}
      </nav>

      <section id="scene-countdown" className="scene scene--countdown">
        <div>
          {today ? (
            <Suspense fallback={<p className="empty" role="status">טוען…</p>}>
              <Today day={today.day} next={today.next} now={now} preview={preview} />
            </Suspense>
          ) : <Countdown />}
        </div>
        <a href="#scene-odyssey" className="scroll-hint">
          <span>גללו להכיר את הספינה</span>
          <span className="scroll-hint__arrow" aria-hidden="true">↓</span>
        </a>
      </section>

      <section id="scene-odyssey" className="scene scene--odyssey">
        <header className="scene__intro">
          <p className="scene__kicker">הספינה שלנו</p>
          <h2 className="scene__title">Odyssey of the Seas</h2>
        </header>
        <div>
          <OdysseyInfo />
        </div>
      </section>

      <section id="scene-guides" className="scene scene--guides">
        <header className="scene__intro">
          <p className="scene__kicker">לאן מפליגים</p>
          <h2 className="scene__title">המסלול שלנו</h2>
          <p className="scene__lead">חמש עצירות, שמונה ימים. גללו כדי לעבור בין היעדים לפי הסדר.</p>
        </header>
        <ol className="route-strip">
          {stops.map((s) => (
            <li key={s.id}>
              <a href={`#scene-${s.id}`} className="route-strip__stop">
                <span aria-hidden="true">{s.emoji}</span> {s.name}
              </a>
            </li>
          ))}
        </ol>
        <a href={`#scene-${stops[0].id}`} className="scroll-hint scroll-hint--light">
          <span>יוצאים לדרך</span>
          <span className="scroll-hint__arrow" aria-hidden="true">↓</span>
        </a>
      </section>

      {stops.map((s, i) => (
        <section key={s.id} id={`scene-${s.id}`} className="scene scene--dest">
          <article className="dest">

            <div className="dest__body">
              <p className="dest__step">עצירה {i + 1} מתוך {stops.length} · {s.day}</p>
              <h2 className="dest__title">
                <span aria-hidden="true">{s.emoji}</span> {s.name}
              </h2>
              <p className="dest__lead">{s.lead}</p>
              <p className="dest__port">⚓ {s.port}</p>
              <ul className="dest__highlights">
                {s.highlights.map((h) => <li key={h}>{h}</li>)}
              </ul>
              <div className="dest__actions">
                <Link to={s.to} className="btn btn--gold">למדריך המלא ל{s.name}</Link>
                {stops[i + 1] ? (
                  <a href={`#scene-${stops[i + 1].id}`} className="btn btn--outline">
                    הבא: {stops[i + 1].name} ↓
                  </a>
                ) : (
                  <Link to="/itinerary" className="btn btn--outline">🗺️ המסלול המלא</Link>
                )}
              </div>
              {/* קרדיט לתמונת הרקע (דרישת הרישיון) */}
              <a className="dest__credit" href={s.photo.page} target="_blank" rel="noreferrer">
                © {s.photo.credit} · {s.photo.license}
              </a>
            </div>
          </article>
        </section>
      ))}
    </div>
  );
};

export default Home;
