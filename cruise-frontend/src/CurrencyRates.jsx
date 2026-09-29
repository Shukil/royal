import { useEffect, useState } from 'react';

// שערי חליפין עדכניים לשקל, מ-Frankfurter (שערי הבנק המרכזי האירופי, מתעדכנים בכל יום עסקים).
// ה-API חינמי, בלי מפתח, ומאפשר קריאה ישירה מהדפדפן.
const RATES_URL = 'https://api.frankfurter.dev/v1/latest?base=ILS';

// unit: כמה יחידות להציג בשורה, כדי שמטבע חלש (לירה) לא יוצג כ-0.06 ₪
const CURRENCIES = {
  EUR: { name: 'אירו', symbol: '€', unit: 1 },
  USD: { name: 'דולר אמריקאי', symbol: '$', unit: 1 },
  TRY: { name: 'לירה טורקית', symbol: '₺', unit: 100 },
};

// בקשה אחת לכל טעינת האתר, משותפת לכל המדריכים
let ratesPromise = null;
const loadRates = () => {
  ratesPromise ??= fetch(RATES_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`rates ${res.status}`);
      return res.json();
    })
    .catch((err) => {
      ratesPromise = null; // לנסות שוב בפעם הבאה
      throw err;
    });
  return ratesPromise;
};

const formatIls = (n) => n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (iso) => iso.split('-').reverse().join('.');

// codes: המטבעות שבשימוש ביעד, הראשון הוא המטבע המקומי
const CurrencyRates = ({ codes, note }) => {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadRates()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="currency">
      <ul className="currency__list">
        {codes.map((code) => {
          const c = CURRENCIES[code];
          // base=ILS: rates[code] = כמה יחידות מהמטבע שווה שקל אחד
          const perUnit = data?.rates?.[code] ? 1 / data.rates[code] : null;
          return (
            <li key={code} className="currency__item">
              <span className="currency__name">{c.name} <span dir="ltr">({c.symbol})</span></span>
              <span className="currency__rate" dir="ltr">
                {perUnit
                  ? `${c.unit} ${c.symbol} = ${formatIls(perUnit * c.unit)} ₪`
                  : failed ? '' : '…'}
              </span>
            </li>
          );
        })}
      </ul>
      {note && <p className="currency__note">{note}</p>}
      <p className="currency__source">
        {data
          ? `שער יציג של הבנק המרכזי האירופי, נכון ל-${formatDate(data.date)}. בצ׳יינג׳ ובכרטיס האשראי השער יהיה מעט פחות טוב.`
          : failed ? 'לא הצלחנו לטעון את השער העדכני כרגע.' : 'טוען שער עדכני…'}
      </p>
    </div>
  );
};

export default CurrencyRates;
