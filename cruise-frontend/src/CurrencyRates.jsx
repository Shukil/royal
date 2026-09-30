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
// "45 €" / "200 ₪" עם רווח קשיח, כדי שהסימן לא יישבר לשורה נפרדת
const money = (text, symbol) => `${text}\u00a0${symbol}`;

// "45 €", "800₺", "1,250.5" → מספר, או null אם אין מספר
const parseAmount = (text) => {
  const m = text.replace(/,/g, '').match(/\d+(\.\d*)?|\.\d+/);
  return m ? Number(m[0]) : null;
};

// codes: המטבעות שבשימוש ביעד, הראשון הוא המטבע המקומי
const CurrencyRates = ({ codes, note }) => {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [amountText, setAmountText] = useState('');
  // foreign: המטבע הזר בחישוב. toIls: מזר לשקלים (45 € → ₪), או הפוך (200 ₪ → €)
  const [foreign, setForeign] = useState(codes[0]);
  const [toIls, setToIls] = useState(true);

  // אם הקלידו סימן מטבע (€ / $ / ₺ / ₪), עוברים אליו אוטומטית
  const onAmountChange = (e) => {
    const text = e.target.value;
    setAmountText(text);
    const typed = codes.find((code) => text.includes(CURRENCIES[code].symbol));
    if (typed) {
      setForeign(typed);
      setToIls(true);
    } else if (text.includes('₪')) {
      setToIls(false);
    }
  };

  const c = CURRENCIES[foreign];
  const amount = parseAmount(amountText);
  // base=ILS: rates[code] = כמה יחידות מהמטבע שווה שקל אחד
  const rate = data?.rates?.[foreign];
  const result = amount != null && rate ? (toIls ? amount / rate : amount * rate) : null;
  const [inSymbol, outSymbol] = toIls ? [c.symbol, '₪'] : ['₪', c.symbol];
  const calcId = `calc-${codes.join('-')}`;

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
          const cur = CURRENCIES[code];
          const perUnit = data?.rates?.[code] ? 1 / data.rates[code] : null;
          return (
            <li key={code} className="currency__item">
              <span className="currency__name">{cur.name} <span dir="ltr">({cur.symbol})</span></span>
              <span className="currency__rate" dir="ltr">
                {perUnit
                  ? `${cur.unit} ${cur.symbol} = ${formatIls(perUnit * cur.unit)} ₪`
                  : failed ? '' : '…'}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="currency-calc">
        <label className="currency-calc__label" htmlFor={calcId}>
          {toIls ? 'כמה זה בשקלים?' : `כמה זה ב${c.name}?`}
        </label>
        <div className="currency-calc__row">
          <input
            id={calcId}
            className="input currency-calc__input"
            type="text"
            inputMode="decimal"
            dir="ltr"
            placeholder={toIls ? money(c.unit === 1 ? 45 : 800, c.symbol) : money(200, '₪')}
            value={amountText}
            onChange={onAmountChange}
            autoComplete="off"
          />
          <button
            type="button"
            className="currency-calc__swap"
            onClick={() => setToIls((v) => !v)}
            aria-label={toIls ? `החלפת כיוון: משקלים ל${c.name}` : `החלפת כיוון: מ${c.name} לשקלים`}
            title="החלפת כיוון"
          >
            <span dir="ltr">{inSymbol} → {outSymbol}</span>
          </button>
          {codes.length > 1 && (
            <div className="currency-calc__picker" role="radiogroup" aria-label="מטבע">
              {codes.map((code) => (
                <label key={code} className="currency-calc__option" title={CURRENCIES[code].name}>
                  <input
                    type="radio"
                    name={`${calcId}-currency`}
                    value={code}
                    checked={foreign === code}
                    onChange={() => setForeign(code)}
                  />
                  <span aria-hidden="true">{CURRENCIES[code].symbol}</span>
                  <span className="visually-hidden">{CURRENCIES[code].name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <p className="currency-calc__result" aria-live="polite">
          {result != null ? (
            <>
              <span dir="ltr">{money(amount.toLocaleString('he-IL'), inSymbol)}</span>
              {' ≈ '}
              <strong dir="ltr">{money(formatIls(result), outSymbol)}</strong>
            </>
          ) : amount != null && failed ? (
            'אין שער זמין כרגע'
          ) : (
            <span className="currency-calc__hint">
              {toIls ? 'מקלידים מחיר ורואים כמה זה בשקלים' : `מקלידים סכום בשקלים ורואים כמה זה ב${c.name}`}
            </span>
          )}
        </p>
      </div>
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
