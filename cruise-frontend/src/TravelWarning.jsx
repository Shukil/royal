import { useEffect, useState } from 'react';

// אזהרות מסע רשמיות (המטה לביטחון לאומי ומשרד החוץ), מהמאגר הפתוח של data.gov.il.
// נטען בזמן אמת, כך שמוצגת תמיד הרמה העדכנית; בלי אינטרנט - העותק השמור (vite.config.js),
// ולפני הטעינה הראשונה - תמונת המצב מ-29.09.2026 שלמטה
const RESOURCE = '2a01d234-b2b0-4d46-baa0-cec05c401e7d';
const COUNTRIES = { it: 'איטליה', gr: 'יוון', tr: 'תורכיה' };
const NSC_PAGE = 'https://www.gov.il/he/departments/dynamiccollectors/travel-warnings-nsc';

const SNAPSHOT_DATE = '29.09.2026';
const SNAPSHOT = {
  it: { level: 2, nsc: 'רמת איום מזדמן (2): מומלץ לנקוט באמצעי זהירות מוגברים.', mfa: 'שימרו על עירנות, הקשיבו לאמצעי התקשורת.', link: 'https://www.gov.il/he/pages/italy2' },
  gr: { level: 2, nsc: 'רמת איום מזדמן (2): מומלץ לנקוט באמצעי זהירות מוגברים ולהקפיד הקפדה יתרה על מכלול המלצות המל״ל.', mfa: 'שימרו על עירנות, הקשיבו לאמצעי התקשורת.', link: 'https://www.gov.il/he/pages/greece1' },
  tr: { level: 4, nsc: 'רמה 4 / איום גבוה: אין להגיע למדינה זו, ובמקרה של שהייה יש לעזוב את המדינה.', mfa: 'הימנעו מלהגיע לתורכיה. במצב הביטחוני הנוכחי עלול להיות קושי במתן סיוע קונסולרי לישראלים שיקלעו למצוקה.', link: 'https://www.gov.il/he/pages/turkey1' },
};

const levelOf = (text) => Number(text?.match(/רמ(?:ה|ת)[^\d]{0,20}(\d)/)?.[1]) || null;
const clean = (text) => text?.replace(/\s+/g, ' ').trim() || null;

// בקשה אחת לכל טעינת האתר, לכל המדינות יחד
let promise = null;
const loadWarnings = () => {
  const filters = encodeURIComponent(JSON.stringify({ country: Object.values(COUNTRIES) }));
  promise ??= fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=${RESOURCE}&filters=${filters}&limit=50`)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
    .then((j) => {
      const out = {};
      for (const [code, name] of Object.entries(COUNTRIES)) {
        const rows = j.result.records.filter((r) => r.country === name);
        const nsc = rows.find((r) => r['משרד'] === 'מל"ל');
        const mfa = rows.find((r) => r['משרד'] === 'חוץ' && r.recommendations && !/דרכון/.test(r.recommendations));
        if (!nsc) continue;
        out[code] = {
          level: levelOf(nsc.recommendations),
          nsc: clean(nsc.recommendations),
          mfa: clean(mfa?.recommendations),
          link: nsc.details?.match(/href="([^"]+)"/)?.[1] || NSC_PAGE,
        };
      }
      return out;
    })
    .catch((err) => {
      promise = null;
      throw err;
    });
  return promise;
};

const useWarnings = () => {
  const [state, setState] = useState({ data: SNAPSHOT, live: false });
  useEffect(() => {
    let alive = true;
    loadWarnings()
      .then((data) => alive && setState({ data: { ...SNAPSHOT, ...data }, live: true }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return state;
};

const tone = (level) => (level >= 3 ? 'high' : level === 2 ? 'mid' : 'low');

// country: it / gr / tr. compact: גרסה מקוצרת למדריך או למסך "היום"; onlyHigh: רק רמה 3 ומעלה
const TravelWarning = ({ country, compact = false, onlyHigh = false }) => {
  const { data, live } = useWarnings();
  const codes = country ? [country] : Object.keys(COUNTRIES);

  return (
    <div className="warnings">
      {codes.map((code) => {
        const w = data[code];
        if (!w || (onlyHigh && !(w.level >= 3))) return null;
        const name = COUNTRIES[code] === 'תורכיה' ? 'טורקיה' : COUNTRIES[code];
        return (
          <div key={code} className={`warning warning--${tone(w.level)}${compact ? ' warning--compact' : ''}`} role={w.level >= 3 ? 'alert' : undefined}>
            <p className="warning__title">
              {w.level >= 3 ? '⛔' : '⚠️'} אזהרת מסע ל{name}{w.level ? `: רמה ${w.level}` : ''}
            </p>
            <p className="warning__text">{w.nsc}</p>
            {!compact && w.mfa && <p className="warning__text">משרד החוץ: {w.mfa}</p>}
            {compact && w.level >= 3 && (
              <p className="warning__text">
                כדאי לשקול להישאר על הספינה ביום הזה, ולבדוק שוב את האזהרה לפני ההפלגה.
              </p>
            )}
            <p className="warning__source">
              {live ? 'עדכני מהמאגר הרשמי של המל״ל ומשרד החוץ.' : `נכון ל-${SNAPSHOT_DATE}.`}{' '}
              <a href={w.link} target="_blank" rel="noreferrer">להמלצה המלאה באתר המל״ל ↗</a>
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default TravelWarning;
