import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Countdown from './Countdown';
import OdysseyInfo from './OdysseyInfo';
import { destinations, guideOrder } from './destinations';
import { photos } from './photos';

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
  const root = useRef(null);
  const layers = useRef({});

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    document.documentElement.classList.add('home-snap');

    // מעבר צבעים רציף לפי מיקום הגלילה: סביב כל גבול בין סצנות יש אזור מעבר
    // ברוחב של כמעט מסך שלם, שבו השכבה הבאה מתגלה בהדרגה (smoothstep) מעל הקודמת
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const center = window.scrollY + vh / 2;
      const zone = vh * 0.9;
      let current = scenes[0].id;
      scenes.forEach((s, i) => {
        const node = document.getElementById(`scene-${s.id}`);
        const layer = layers.current[s.id];
        if (!node || !layer) return;
        const top = node.getBoundingClientRect().top + window.scrollY;
        if (center >= top) current = s.id;
        layer.style.opacity = i === 0 ? 1 : smoothstep((center - (top - zone / 2)) / zone);
      });
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // אלמנטים שעולים ומופיעים כשהם נכנסים למסך
    let revealObserver;
    if ('IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver(
        (entries) => entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            revealObserver.unobserve(e.target);
          }
        }),
        { rootMargin: '0px 0px -10% 0px' },
      );
      el.querySelectorAll('.reveal').forEach((r) => revealObserver.observe(r));
      el.classList.add('home--animated');
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
      revealObserver?.disconnect();
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
            className={`home__layer home__layer--${s.id}`}
            style={{ opacity: i === 0 ? 1 : 0 }}
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
        <div className="reveal">
          <Countdown />
        </div>
        <a href="#scene-odyssey" className="scroll-hint">
          <span>גללו להכיר את הספינה</span>
          <span className="scroll-hint__arrow" aria-hidden="true">↓</span>
        </a>
      </section>

      <section id="scene-odyssey" className="scene scene--odyssey">
        <header className="scene__intro reveal">
          <p className="scene__kicker">הספינה שלנו</p>
          <h2 className="scene__title">Odyssey of the Seas</h2>
        </header>
        <div className="reveal">
          <OdysseyInfo />
        </div>
      </section>

      <section id="scene-guides" className="scene scene--guides">
        <header className="scene__intro reveal">
          <p className="scene__kicker">לאן מפליגים</p>
          <h2 className="scene__title">המסלול שלנו</h2>
          <p className="scene__lead">חמש עצירות, שמונה ימים. גללו כדי לעבור בין היעדים לפי הסדר.</p>
        </header>
        <ol className="route-strip reveal">
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
          <article className="dest reveal">
            <figure className="dest__photo">
              <img src={s.photo.src} alt={s.photo.caption} loading="lazy" decoding="async" />
              <figcaption>
                <a href={s.photo.page} target="_blank" rel="noreferrer" dir="ltr">
                  © {s.photo.credit} · {s.photo.license}
                </a>
              </figcaption>
            </figure>

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
            </div>
          </article>
        </section>
      ))}
    </div>
  );
};

export default Home;
