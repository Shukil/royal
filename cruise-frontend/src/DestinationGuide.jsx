import { lazy, Suspense } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { destinations, guideOrder } from './destinations';
import { photos } from './photos';
import Gallery, { Photo } from './Gallery';
import Spots from './Spots';
import CurrencyRates from './CurrencyRates';
import Weather from './Weather';
import TravelWarning from './TravelWarning';
import Phrasebook from './Phrasebook';
import { guideLanguage, languages } from './phrases';
import { tripDays } from './tripDays';

const GuideMap = lazy(() => import('./GuideMap'));

// המדינה של כל יעד, לאזהרת המסע
const WARNING_COUNTRY = { santorini: 'gr', mykonos: 'gr', kusadasi: 'tr', naples: 'it' };

const toc = [
  { id: 'port', label: 'הנמל' },
  { id: 'about', label: 'על היעד' },
  { id: 'weather', label: 'מזג אוויר' },
  { id: 'photos', label: 'תמונות' },
  { id: 'routes', label: 'מסלולים' },
  { id: 'sites', label: 'אתרים' },
  { id: 'map', label: 'מפה' },
  { id: 'food', label: 'אוכל' },
  { id: 'shopping', label: 'קניות' },
  { id: 'transport', label: 'תחבורה וטיפים' },
  { id: 'phrases', label: 'מילים שימושיות' },
];

const DestinationGuide = () => {
  const { id } = useParams();
  const d = destinations[id];
  if (!d) return <Navigate to="/guides" replace />;

  const pics = photos[id];
  const planDate = tripDays.find((t) => t.guide.to === `/guide/${id}` && t.boardBy)?.date;
  const index = guideOrder.indexOf(id);
  const prev = guideOrder[index - 1];
  const next = guideOrder[index + 1];

  return (
    <div className="page">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">המדריך ל{d.name} {d.emoji}</h1>
          <p className="card__lead">{d.lead}</p>
          <p className="card__lead">{d.day}</p>
        </header>

        <div className="card__body">
          <nav className="toc" aria-label="תוכן המדריך">
            {toc.map((t) => (
              <a key={t.id} href={`#${t.id}`} className="toc__link">{t.label}</a>
            ))}
          </nav>

          <TravelWarning country={WARNING_COUNTRY[id]} compact />

          {planDate && (
            <p className="plan-link">
              <Link to={`/plan?day=${planDate}`} className="btn btn--outline btn--sm">📋 התוכנית שלנו ליום הזה</Link>
            </p>
          )}

          <section className="section prose" id="port">
            <h2 className="section__title">⚓ הנמל: {d.port.title}</h2>
            <ul>
              {d.port.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
            {pics?.port && <Photo photo={pics.port} className="photo--wide" />}
          </section>

          <section className="section" id="about">
            <h2 className="section__title">על {d.name} בקצרה</h2>
            <dl className="facts">
              {d.facts.map((f) => (
                <div key={f.label} className={f.currencies ? 'fact fact--wide' : 'fact'}>
                  <dt>{f.label}</dt>
                  <dd>{f.currencies ? <CurrencyRates codes={f.currencies} note={f.note} /> : f.value}</dd>
                </div>
              ))}
            </dl>
            <p className="prose">{d.about}</p>
          </section>

          <section className="section" id="weather">
            <h2 className="section__title">מזג האוויר 🌤️</h2>
            <Weather id={id} />
          </section>

          {pics?.gallery && (
            <section className="section" id="photos">
              <h2 className="section__title">תמונות מ{d.name} 📷</h2>
              <Gallery photos={pics.gallery} />
            </section>
          )}

          <section className="section" id="routes">
            <h2 className="section__title">מסלולים מומלצים 🚶</h2>
            <div className="routes">
              {d.routes.map((r) => (
                <div key={r.title} className="route">
                  <h3 className="route__title">{r.title}</h3>
                  <ol className="route__stops">
                    {r.stops.map((s) => <li key={s}>{s}</li>)}
                  </ol>
                  <p className="route__note">{r.note}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="section" id="sites">
            <h2 className="section__title">אתרים שכדאי להכיר 📸</h2>
            <div className="sites">
              {d.sites.map((s) => (
                <details key={s.name} className="site">
                  <summary className="site__summary">
                    <span>{s.name}</span>
                    <span className="site__en" dir="ltr">{s.en}</span>
                  </summary>
                  <p className="site__body">{s.body}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="section" id="map">
            <h2 className="section__title">מפה 🗺️</h2>
            <p className="field__hint">⚓ הנמל, והמספרים לפי רשימת האתרים. לחיצה על נקודה פותחת ניווט ב-Google Maps.</p>
            <Suspense fallback={<p className="empty">טוען מפה…</p>}>
              <GuideMap id={id} />
            </Suspense>
          </section>

          <section className="section" id="food">
            <h2 className="section__title">אוכל 🍽️</h2>
            <p className="prose">{d.food.intro}</p>
            <Spots items={d.food.spots} />
            <p className="tip">הרשימה כוללת מקומות ותיקים ומוכרים, אבל כדאי לבדוק שעות פתיחה לפני שהולכים.</p>
          </section>

          <section className="section" id="shopping">
            <h2 className="section__title">קניות 🛍️</h2>
            <Spots items={d.shopping} />
          </section>

          <section className="section" id="transport">
            <h2 className="section__title">תחבורה וטיפים 🚌</h2>
            <div className="table-wrap">
              <table className="metro">
                <thead>
                  <tr>
                    <th scope="col">קו / יעד</th>
                    <th scope="col">אמצעי</th>
                    <th scope="col">פרטים</th>
                  </tr>
                </thead>
                <tbody>
                  {d.transport.map((t) => (
                    <tr key={t.stop}>
                      <td dir="auto">{t.stop}</td>
                      <td>{t.line}</td>
                      <td>{t.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="prose">
              <ul>
                {d.tips.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          </section>

          <section className="section" id="phrases">
            <h2 className="section__title">מילים שימושיות ב{languages[guideLanguage[id]].name} 💬</h2>
            <Phrasebook lang={guideLanguage[id]} />
          </section>

          <nav className="guide-nav" aria-label="מדריכים נוספים">
            {prev ? (
              <Link to={`/guide/${prev}`} className="quick-link">→ {destinations[prev].name}</Link>
            ) : (
              <Link to="/rome-guide" className="quick-link">→ רומא</Link>
            )}
            <Link to="/itinerary" className="quick-link">🗺️ המסלול המלא</Link>
            {next && <Link to={`/guide/${next}`} className="quick-link">{destinations[next].name} ←</Link>}
          </nav>
        </div>
      </article>
    </div>
  );
};

export default DestinationGuide;
