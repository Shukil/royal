import { useEffect, useState } from 'react';
import { describeWeather, weather } from './weatherData';

const FORECAST_DAYS = 16; // כמה ימים קדימה Open-Meteo נותן תחזית
const DAY = 24 * 60 * 60 * 1000;

const rainText = (pct) => {
  if (pct <= 5) return 'כמעט אף פעם';
  if (pct <= 25) return 'מדי פעם, בעיקר סופות קצרות';
  return 'אפשרי';
};

const shortDate = (iso) => iso.split('-').reverse().slice(0, 2).join('.');

// התאריכים של היעד שכבר נכנסו לטווח התחזית
const forecastDates = (dates, now) =>
  dates.filter((d) => {
    const t = Date.parse(`${d}T12:00:00Z`);
    return t >= now - DAY && t <= now + (FORECAST_DAYS - 1) * DAY;
  });

const useForecast = (w, dates) => {
  const [state, setState] = useState(null);
  const key = dates.join(',');

  useEffect(() => {
    if (!key) return undefined;
    const list = key.split(',');
    let alive = true;
    const params = new URLSearchParams({
      latitude: w.lat,
      longitude: w.lon,
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max',
      timezone: 'auto',
      start_date: list[0],
      end_date: list.at(-1),
    });
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .then((j) => alive && setState(j.daily.time.map((date, i) => ({
        date,
        code: j.daily.weather_code[i],
        max: Math.round(j.daily.temperature_2m_max[i]),
        min: Math.round(j.daily.temperature_2m_min[i]),
        rain: j.daily.precipitation_probability_max[i],
        wind: Math.round(j.daily.wind_speed_10m_max[i]),
        uv: Math.round(j.daily.uv_index_max[i]),
      }))))
      .catch(() => alive && setState(null));
    return () => {
      alive = false;
    };
  }, [w.lat, w.lon, key]);

  return state;
};

// מזג האוויר ביעד: תחזית אמיתית כשהתאריך קרוב, ולפני כן הממוצע לתאריכים האלה.
// compact: שורה אחת למסך "היום"
const Weather = ({ id, date, compact = false }) => {
  const w = weather[id];
  const [now] = useState(Date.now);
  const dates = forecastDates(date ? [date] : w?.dates ?? [], now);
  const forecast = useForecast(w ?? {}, w ? dates : []);
  if (!w) return null;

  const c = w.climate;

  if (compact) {
    const f = forecast?.[0];
    return (
      <p className="weather-line">
        {f ? (
          <>{describeWeather(f.code).icon} {describeWeather(f.code).text} · <span dir="ltr">{f.min}°–{f.max}°</span> · גשם {f.rain}% · רוח {f.wind} קמ״ש</>
        ) : (
          <>🌡️ בדרך כלל <span dir="ltr">{Math.round(c.min)}°–{Math.round(c.max)}°</span>{c.sea && <> · מים {Math.round(c.sea)}°</>} · שקיעה {c.sunset}</>
        )}
      </p>
    );
  }

  return (
    <div className="weather">
      {forecast && (
        <div className="weather__forecast">
          <h3 className="weather__subtitle">התחזית</h3>
          <ul className="weather__days">
            {forecast.map((f) => {
              const d = describeWeather(f.code);
              return (
                <li key={f.date} className="weather__day">
                  <span className="weather__date">{shortDate(f.date)}</span>
                  <span className="weather__icon" aria-hidden="true">{d.icon}</span>
                  <span>{d.text}</span>
                  <strong dir="ltr">{f.min}°–{f.max}°</strong>
                  <span>גשם {f.rain}% · רוח {f.wind} קמ״ש · UV {f.uv}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <h3 className="weather__subtitle">
        {forecast ? 'בדרך כלל בתאריכים האלה' : `מה צפוי ב-${w.dates.length > 1 ? `${shortDate(w.dates[0])}–${shortDate(w.dates.at(-1))}` : shortDate(w.dates[0])}`}
      </h3>
      <dl className="facts weather__facts">
        <div className="fact"><dt>☀️ ביום</dt><dd dir="ltr">{Math.round(c.max)}°</dd></div>
        <div className="fact"><dt>🌙 בלילה</dt><dd dir="ltr">{Math.round(c.min)}°</dd></div>
        {c.sea && <div className="fact"><dt>🌊 המים</dt><dd dir="ltr">{Math.round(c.sea)}°</dd></div>}
        <div className="fact"><dt>🌅 שקיעה</dt><dd>{c.sunset}</dd></div>
        <div className="fact"><dt>💨 רוח</dt><dd>עד {c.wind} קמ״ש</dd></div>
        <div className="fact"><dt>🌧️ גשם</dt><dd>{rainText(c.rainyDays)}</dd></div>
      </dl>
      <p className="weather__tip">💡 {w.tip}</p>
      <p className="weather__source">
        {forecast
          ? 'התחזית מ-Open-Meteo. הממוצעים לפי 12–22 באוגוסט בעשר השנים האחרונות.'
          : `ממוצע של 12–22 באוגוסט בעשר השנים האחרונות (Open-Meteo). כ-${FORECAST_DAYS} יום לפני, תופיע כאן התחזית האמיתית.`}
      </p>
    </div>
  );
};

export default Weather;
