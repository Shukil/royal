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
  const [from, setFrom] = useState(codes[0]);

  // אם הקלידו סימן מטבע (€ / $ / ₺), עוברים אליו אוטומטית
  const onAmountChange = (e) => {
    const text = e.target.value;
    setAmountText(text);
    const typed = codes.find((code) => text.includes(CURRENCIES[code].symbol));
    if (typed) setFrom(typed);
  };

  const amount = parseAmount(amountText);
  const fromRate = data?.rates?.[from];
  const inIls = amount != null && fromRate ? amount / fromRate : null;

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
      <div className="currency-calc">
        <label className="currency-calc__label" htmlFor={`calc-${codes.join('-')}`}>כמה זה בשקלים?</label>
        <div className="currency-calc__row">
          <input
            id={`calc-${codes.join('-')}`}
            className="input currency-calc__input"
            type="text"
            inputMode="decimal"
            dir="ltr"
            placeholder={`${CURRENCIES[from].unit === 1 ? 45 : 800} ${CURRENCIES[from].symbol}`}
            value={amountText}
            onChange={onAmountChange}
            autoComplete="off"
          />
          {codes.length > 1 && (
            <div className="currency-calc__picker" role="radiogroup" aria-label="מטבע">
              {codes.map((code) => (
                <label key={code} className="currency-calc__option" title={CURRENCIES[code].name}>
                  <input
                    type="radio"
                    name={`calc-from-${codes.join('-')}`}
                    value={code}
                    checked={from === code}
                    onChange={() => setFrom(code)}
                  />
                  <span aria-hidden="true">{CURRENCIES[code].symbol}</span>
                  <span className="visually-hidden">{CURRENCIES[code].name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <p className="currency-calc__result" aria-live="polite">
          {inIls != null ? (
            <>
              <span dir="ltr">{amount.toLocaleString('he-IL')} {CURRENCIES[from].symbol}</span>
              {' ≈ '}
              <strong dir="ltr">{formatIls(inIls)} ₪</strong>
            </>
          ) : amount != null && failed ? (
            'אין שער זמין כרגע'
          ) : (
            <span className="currency-calc__hint">מקלידים מחיר ורואים כמה זה בשקלים</span>
          )}
        </p>
      </div>
      {note &&<p className="currency__note">{note}</p>}
      <p className="currency__source">
        {data
          ? `שער יציג של הבנק המרכזי האירופי, נכון ל-${formatDate(data.date)}. בצ׳יינג׳ ובכרטיס האשראי השער יהיה מעט פחות טוב.`
          : failed ? 'לא הצלחנו לטעון את השער העדכני כרגע.' : 'טוען שער עדכני…'}
      </p>
    </div>
  );
};

export default CurrencyRates;
